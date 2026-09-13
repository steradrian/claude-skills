#!/usr/bin/env bash
# Trello REST helper for /core:pr-from-card and /core:trello. Every call is one
# curl against api.trello.com; JSON parsing goes through python3 so the script
# works in a cloud session without jq.
#
# Env (set once on the cloud environment / in settings.json "env"):
#   TRELLO_KEY, TRELLO_TOKEN   API key + token, https://trello.com/power-ups/admin
#   TRELLO_BOARD               board id or short link (the <x> in trello.com/b/<x>/...)
#   TRELLO_MEMBER              username to assign new cards to; default: the token's own account
#   TRELLO_LIST_READY | _PROGRESS | _REVIEW | _DONE
#                              list names; default "Ready", "In progress", "In review", "Done"
#
# Usage:
#   trello.sh check                          prints "ok" or the missing variables, exit 1
#   trello.sh board                          lists, labels and members on the board
#   trello.sh cards [list]                   open cards on the board (or in one list), one JSON per line
#   trello.sh get <card>                     card JSON incl. labels, members, checklists
#   trello.sh create <title> <desc> [labels] creates a card in Ready, assigned to TRELLO_MEMBER;
#                                            labels is comma-separated label names
#   trello.sh label <card> <labels>          adds labels (comma-separated names)
#   trello.sh assign <card> [username]       adds a member; default TRELLO_MEMBER / token owner
#   trello.sh checklist <card> <name> <item>...  creates a checklist with items
#   trello.sh tick <card> <item text>        marks the checklist item whose text contains <item text>
#   trello.sh move <card> ready|progress|review|done
#   trello.sh comment <card> <text>
#   trello.sh attach <card> <url>
#   trello.sh archive <card>                 archives (closes) a card; nothing is ever deleted
# <card> is a card id, a short link, or a full trello.com/c/... URL.
# <list> is one of ready|progress|review|done or an exact list name.

set -euo pipefail

API="https://api.trello.com/1"

die() { printf 'trello: %s\n' "$*" >&2; exit 1; }

need_env() {
  local missing=()
  for v in TRELLO_KEY TRELLO_TOKEN TRELLO_BOARD; do
    [ -n "${!v:-}" ] || missing+=("$v")
  done
  [ ${#missing[@]} -eq 0 ] || { printf 'missing: %s\n' "${missing[*]}"; return 1; }
}

auth() { printf 'key=%s&token=%s' "$TRELLO_KEY" "$TRELLO_TOKEN"; }

# Accepts an id, a short link, or a card URL; prints the id-or-shortLink the API takes.
card_ref() {
  local ref="$1"
  case "$ref" in
    *trello.com/c/*) ref="${ref#*trello.com/c/}"; ref="${ref%%/*}"; ref="${ref%%\?*}" ;;
  esac
  printf '%s' "$ref"
}

# curl wrapper: method, path, then any number of --data-urlencode pairs.
call() {
  local method="$1" path="$2"; shift 2
  local out code
  out=$(curl -sS -X "$method" "$API$path?$(auth)" "$@" -w '\n%{http_code}')
  code="${out##*$'\n'}"; out="${out%$'\n'*}"
  [ "$code" -ge 200 ] && [ "$code" -lt 300 ] || die "$method $path -> HTTP $code: $out"
  printf '%s' "$out"
}

board_lists()   { call GET "/boards/$TRELLO_BOARD/lists"   --get --data-urlencode "fields=name"; }
board_labels()  { call GET "/boards/$TRELLO_BOARD/labels"  --get --data-urlencode "fields=name,color"; }
board_members() { call GET "/boards/$TRELLO_BOARD/members" --get --data-urlencode "fields=fullName,username"; }

# Case-insensitive name → id over a JSON array; exits 1 with a message when absent.
pick_id() {
  python3 -c '
import json, sys
key, name = sys.argv[1], sys.argv[2].casefold()
for x in json.load(sys.stdin):
    if (x.get(key) or "").casefold() == name:
        print(x["id"]); sys.exit(0)
sys.exit(f"no {key} {sys.argv[2]!r} on board")' "$@"
}

list_id() {
  local name
  case "$1" in
    ready)    name="${TRELLO_LIST_READY:-Ready}" ;;
    progress) name="${TRELLO_LIST_PROGRESS:-In progress}" ;;
    review)   name="${TRELLO_LIST_REVIEW:-In review}" ;;
    done)     name="${TRELLO_LIST_DONE:-Done}" ;;
    *)        name="$1" ;;
  esac
  board_lists | pick_id name "$name"
}

# Comma-separated label names → comma-separated ids. Unknown names are skipped with a warning.
label_ids() {
  board_labels | python3 -c '
import json, sys
want = [n.strip() for n in sys.argv[1].split(",") if n.strip()]
have = {(l.get("name") or "").casefold(): l["id"] for l in json.load(sys.stdin)}
ids = []
for n in want:
    if n.casefold() in have: ids.append(have[n.casefold()])
    else: print(f"trello: no label {n!r} on board, skipped", file=sys.stderr)
print(",".join(ids))' "$1"
}

member_id() {
  local user="${1:-${TRELLO_MEMBER:-}}"
  if [ -z "$user" ]; then
    call GET "/members/me" --get --data-urlencode "fields=id" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])'
  else
    board_members | pick_id username "${user#@}"
  fi
}

print_card() {
  python3 -c '
import json, sys
c = json.load(sys.stdin)
lists = {l["id"]: l["name"] for l in json.loads(sys.argv[1])} if len(sys.argv) > 1 else {}
print(json.dumps({
    "id": c["id"], "shortLink": c["shortLink"], "shortUrl": c["shortUrl"],
    "name": c["name"], "desc": c.get("desc", ""),
    "list": lists.get(c.get("idList"), c.get("idList")),
    "labels": [l["name"] for l in c.get("labels", [])],
    "members": [m["username"] for m in c.get("members", [])],
    "checklists": [{"name": cl["name"], "items": [
        {"text": i["name"], "done": i["state"] == "complete"} for i in cl.get("checkItems", [])]}
        for cl in c.get("checklists", [])],
}, indent=2, ensure_ascii=False))' "$@"
}

require() { need_env >/dev/null || die "$(need_env)"; }

cmd="${1:-}"; shift || true
case "$cmd" in
  check)
    need_env && echo ok ;;
  board)
    require
    printf 'lists:   '; board_lists   | python3 -c 'import json,sys; print(", ".join(l["name"] for l in json.load(sys.stdin)))'
    printf 'labels:  '; board_labels  | python3 -c 'import json,sys; print(", ".join(l["name"] + " (" + l["color"] + ")" for l in json.load(sys.stdin) if l.get("name")))'
    printf 'members: '; board_members | python3 -c 'import json,sys; print(", ".join(m["fullName"] + " @" + m["username"] for m in json.load(sys.stdin)))' ;;
  cards)
    require
    lists=$(board_lists)
    if [ -n "${1:-}" ]; then path="/lists/$(list_id "$1")/cards"; else path="/boards/$TRELLO_BOARD/cards"; fi
    call GET "$path" --get --data-urlencode "fields=name,shortLink,shortUrl,idList,labels" --data-urlencode "members=true" --data-urlencode "member_fields=username" \
      | python3 -c '
import json, sys
lists = {l["id"]: l["name"] for l in json.loads(sys.argv[1])}
for c in json.load(sys.stdin):
    print(json.dumps({"shortLink": c["shortLink"], "shortUrl": c["shortUrl"], "name": c["name"],
                      "list": lists.get(c["idList"], c["idList"]), "labels": [l["name"] for l in c.get("labels", [])],
                      "members": [m["username"] for m in c.get("members", [])]}, ensure_ascii=False))' "$lists" ;;
  get)
    require
    ref=$(card_ref "${1:?card}")
    lists=$(board_lists)
    call GET "/cards/$ref" --get --data-urlencode "fields=name,desc,shortLink,shortUrl,idList,labels" \
      --data-urlencode "members=true" --data-urlencode "member_fields=username" \
      --data-urlencode "checklists=all" --data-urlencode "checklist_fields=name" \
      | print_card "$lists" ;;
  create)
    require
    title="${1:?title}"; desc="${2:-}"; labels="${3:-}"
    args=(--data-urlencode "idList=$(list_id ready)" --data-urlencode "name=$title"
          --data-urlencode "desc=$desc" --data-urlencode "pos=top"
          --data-urlencode "idMembers=$(member_id)")
    [ -n "$labels" ] && args+=(--data-urlencode "idLabels=$(label_ids "$labels")")
    id=$(call POST "/cards" "${args[@]}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
    exec "$0" get "$id" ;;
  label)
    require
    ref=$(card_ref "${1:?card}")
    ids=$(label_ids "${2:?labels}")
    for id in ${ids//,/ }; do call POST "/cards/$ref/idLabels" --data-urlencode "value=$id" >/dev/null; done
    echo labelled ;;
  assign)
    require
    ref=$(card_ref "${1:?card}")
    call POST "/cards/$ref/idMembers" --data-urlencode "value=$(member_id "${2:-}")" >/dev/null && echo assigned ;;
  checklist)
    require
    ref=$(card_ref "${1:?card}"); name="${2:?checklist name}"; shift 2
    id=$(call GET "/cards/$ref" --get --data-urlencode "fields=id" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
    cl=$(call POST "/checklists" --data-urlencode "idCard=$id" --data-urlencode "name=$name" \
      | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
    for item in "$@"; do call POST "/checklists/$cl/checkItems" --data-urlencode "name=$item" >/dev/null; done
    echo "checklist created: $# items" ;;
  tick)
    require
    ref=$(card_ref "${1:?card}"); needle="${2:?item text}"
    item=$(call GET "/cards/$ref/checklists" --get --data-urlencode "checkItem_fields=name,state" | python3 -c '
import json, sys
needle = sys.argv[1].casefold()
for cl in json.load(sys.stdin):
    for i in cl.get("checkItems", []):
        if needle in i["name"].casefold():
            print(i["id"]); sys.exit(0)
sys.exit(f"no checklist item matching {sys.argv[1]!r}")' "$needle")
    call PUT "/cards/$ref/checkItem/$item" --data-urlencode "state=complete" >/dev/null && echo ticked ;;
  move)
    require
    ref=$(card_ref "${1:?card}")
    call PUT "/cards/$ref" --data-urlencode "idList=$(list_id "${2:?list}")" >/dev/null && echo moved ;;
  comment)
    require
    ref=$(card_ref "${1:?card}")
    call POST "/cards/$ref/actions/comments" --data-urlencode "text=${2:?text}" >/dev/null && echo commented ;;
  attach)
    require
    ref=$(card_ref "${1:?card}")
    call POST "/cards/$ref/attachments" --data-urlencode "url=${2:?url}" >/dev/null && echo attached ;;
  archive)
    require
    ref=$(card_ref "${1:?card}")
    call PUT "/cards/$ref" --data-urlencode "closed=true" >/dev/null && echo archived ;;
  *)
    sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
