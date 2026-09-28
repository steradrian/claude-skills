# motion-ad (Claude Code skill)

Install: put the folder in `<config>/skills/motion-ad/` (personal) or a plugin's `skills/`.

Dependencies: `bash scripts/setup.sh` creates a private virtualenv at
`~/.local/share/motion-ad/venv` with playwright, pillow and chromium (Homebrew python refuses global
pip installs); the scripts switch into it on their own. ffmpeg comes from `brew install ffmpeg`.

Use: ask for a video ad ("make me a 15s Reels ad for my coffee brand"). The skill asks everything it
needs in one intake, then concepts, style-frames, storyboards, builds, self-critiques and renders an
MP4 without further check-ins, and reviews the cut with you at the end. Projects land in
`./ads/<slug>/` and are excluded from git.
