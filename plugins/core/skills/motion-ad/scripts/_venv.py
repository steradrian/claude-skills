"""Run the calling script under the skill's own virtualenv when the current python lacks playwright.

Homebrew and other PEP 668 pythons refuse global `pip install`, so setup.sh installs the render
dependencies into VENV, and the scripts re-exec themselves there. Commands stay `python3 <script>`.
"""
import importlib.util, os, sys

VENV = os.path.expanduser(os.environ.get('MOTION_AD_VENV', '~/.local/share/motion-ad/venv'))
PY = os.path.join(VENV, 'bin', 'python')


def ensure():
    if importlib.util.find_spec('playwright') and importlib.util.find_spec('PIL'):
        return
    if os.path.exists(PY) and os.path.realpath(sys.prefix) != os.path.realpath(VENV):
        os.execv(PY, [PY] + sys.argv)
