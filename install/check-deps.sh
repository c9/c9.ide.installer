set -e

has() {
  type "$1" > /dev/null 2>&1
  return $?
}

if [[ `cat /etc/issue 2>/dev/null` =~ CentOS ]]; then
  OS="CentOS"
elif [[ `cat /proc/version 2>/dev/null` =~ Ubuntu|Debian ]]; then
  OS="DEBIAN"
fi

for DEP in "make" "gcc" "g++"; do
  if ! has $DEP; then
    echo "Error: please install $DEP to proceed" >&2
    if [ "$OS" == "CentOS" ]; then
      echo "To do so, log into your machine and type 'yum groupinstall -y development'" >&2
    elif [ "$OS" == "DEBIAN" ]; then
      echo "To do so, log into your machine and type 'sudo apt-get install build-essential'" >&2
    fi
    ERR=1
  fi
done

# CentOS
if [ "$OS" == "CentOS" ]; then
  if ! yum list installed glibc-static >/dev/null 2>&1; then
    echo "Error: please install glibc-static to proceed" >&2
    echo "To do so, log into your machine and type 'yum install glibc-static'" >&2
    ERR=1
  fi
fi

if which python2.7 &> /dev/null; then
  PYTHONVERSION="2.7"
else
  PYTHONVERSION=`python --version 2>&1`
fi

if [[ $PYTHONVERSION != *2.7* ]]; then
  echo "Python version 2.7 is required to install pty.js. Please install python 2.7 and try again. You can find more information on how to install Python in the docs: https://docs.c9.io/ssh_workspaces.html"
  ERR=1
fi

if [ "$ERR" ]; then exit 1; fi