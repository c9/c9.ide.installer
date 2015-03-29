set -e

has() {
  type "$1" > /dev/null 2>&1
  return $?
}

if has "wget"; then
    DOWNLOAD="wget --no-check-certificate -nc"
elif has "curl"; then
    DOWNLOAD="curl -sSOL"
else
    echo "Error: you need curl or wget to proceed" >&2;
    exit 1
fi

C9_DIR=$HOME/.c9
NPM=$C9_DIR/node/bin/npm

download_virtualenv() {
  VIRTUALENV_VERSION="virtualenv-12.0.7"
  $DOWNLOAD "https://pypi.python.org/packages/source/v/virtualenv/$VIRTUALENV_VERSION.tar.gz"
  tar xzf $VIRTUALENV_VERSION.tar.gz
  rm $VIRTUALENV_VERSION.tar.gz
  mv $VIRTUALENV_VERSION virtualenv
}

# use local npm cache
"$NPM" config -g set cache  "$C9_DIR/tmp/.npm"

# when gyp is installed globally npm install pty.js won't work
# to test this use `sudo apt-get install gyp`
if [ `python -c 'import gyp; print gyp.__file__' 2> /dev/null` ]; then
  echo "You have a global gyp installed. Setting up VirtualEnv without global pakages"
  rm -rf virtualenv
  rm -rf python
  if has virtualenv; then
    virtualenv "$C9_DIR/python"
  else
    download_virtualenv
    python virtualenv/virtualenv.py "$C9_DIR/python"
  fi
  if [[ -f "$C9_DIR/python/bin/python2" ]]; then
    "$NPM" config -g set python "$C9_DIR/python/bin/python2"
    export PYTHON="$C9_DIR/python/bin/python2"
  else
    echo "Unable to setup virtualenv"
    exit 1
  fi
fi