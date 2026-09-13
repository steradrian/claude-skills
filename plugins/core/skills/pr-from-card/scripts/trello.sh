#!/usr/bin/env bash
# Trello REST helper for /core:pr-from-card. Every call is one curl against
# api.trello.com; JSON parsing goes through python3 so the script works in a
# cloud session without jq.
#
# Env (set once on the cloud environment / in the shell):
#   TRELLO_KEY, TRELLO_TOKEN   API key + token, https://trello.com/power-ups/admin
#   TRELLO_BOARD               board id or short link (the <x> in trello.com/b/<x>/...)
#   TRELLO_LIST_READY | _PROGRESS | _REVIEW | _DONE
#                              list names; default "Ready", "In progress", "In review", "Done"
#
# Usage:
#   trello.sh check                          prints "ok" or the missing variables, exit 1
#   trello.sh lists                          list names on the board, one per line
#   trello.sh cards [list]                   open cards on the board (or in one list), one JSON per line
#   trello.sh get <card>                     card JSON: id, shortLink, shortUrl, name, desc, list
#   trello.sh create <title> <desc>          creates a card in the Ready list, prints card JSON
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

board_lists() {
  call GET "/boards/$TRELLO_BOARD/lists" --get --data-urlencode "fields=name"
}

list_id() {
  local kind="$1" name
  case "$kind" in
    ready)    name="${TRELLO_LIST_READY:-Ready}" ;;
    progress) name="${TRELLO_LIST_PROGRESS:-In progress}" ;;
    review)   name="${TRELLO_LIST_REVIEW:-In review}" ;;
    done)     name="${TRELLO_LIST_DONE:-Done}" ;;
    *)        name="$kind" ;;
  esac
  board_lists | python3 -c '
import json, sys
name = sys.argv[1].casefold()
for l in json.load(sys.stdin):
    if l["name"].casefold() == name:
        print(l["id"]); sys.exit(0)
sys.exit(f"no list named {sys.argv[1]!r} on board")' "$name"
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
}, indent=2))' "$@"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  check)
    need_env && echo ok ;;
  lists)
    need_env >/dev/null || die "$(need_env)"
    board_lists | python3 -c 'import json,sys; print("\n".join(l["name"] for l in json.load(sys.stdin)))' ;;
  cards)
    need_env >/dev/null || die "$(need_env)"
    lists=$(board_lists)
    if [ -n "${1:-}" ]; then path="/lists/$(list_id "$1")/cards"; else path="/boards/$TRELLO_BOARD/cards"; fi
    call GET "$path" --get --data-urlencode "fields=name,shortLink,shortUrl,idList,labels" \
      | python3 -c '
import json, sys
lists = {l["id"]: l["name"] for l in json.loads(sys.argv[1])}
for c in json.load(sys.stdin):
    print(json.dumps({"shortLink": c["shortLink"], "shortUrl": c["shortUrl"], "name": c["name"],
                      "list": lists.get(c["idList"], c["idList"]), "labels": [l["name"] for l in c.get("labels", [])]}))' "$lists" ;;
  get)
    need_env >/dev/null || die "$(need_env)"
    ref=$(card_ref "${1:?card}")
    lists=$(board_lists)
    call GET "/cards/$ref" --get --data-urlencode "fields=name,desc,shortLink,shortUrl,idList,labels" \
      | print_card "$lists" ;;
  create)
    need_env >/dev/null || die "$(need_env)"
    title="${1:?title}"; desc="${2:-}"
    call POST "/cards" --data-urlencode "idList=$(list_id ready)" \
      --data-urlencode "name=$title" --data-urlencode "desc=$desc" --data-urlencode "pos=top" \
      | print_card ;;
  move)
    need_env >/dev/null || die "$(need_env)"
    ref=$(card_ref "${1:?card}")
    call PUT "/cards/$ref" --data-urlencode "idList=$(list_id "${2:?list}")" >/dev/null && echo moved ;;
  comment)
    need_env >/dev/null || die "$(need_env)"
    ref=$(card_ref "${1:?card}")
    call POST "/cards/$ref/actions/comments" --data-urlencode "text=${2:?text}" >/dev/null && echo commented ;;
  attach)
    need_env >/dev/null || die "$(need_env)"
    ref=$(card_ref "${1:?card}")
    call POST "/cards/$ref/attachments" --data-urlencode "url=${2:?url}" >/dev/null && echo attached ;;
  archive)
    need_env >/dev/null || die "$(need_env)"
    ref=$(card_ref "${1:?card}")
    call PUT "/cards/$ref" --data-urlencode "closed=true" >/dev/null && echo archived ;;
  *)
    sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
