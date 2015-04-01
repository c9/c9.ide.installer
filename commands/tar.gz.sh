set -e

SOURCE=$0
TARGET=$1
URL=$2
DIR=$3

has() {
  type "$1" > /dev/null 2>&1
  return $?
}

if [ ! "$SOURCE" ] || [ ! "$URL" ] || [ ! "$TARGET" ]; then
    echo "Error: missing source and/or target" >&2;
    exit 1
fi

if [ "$DIR" ]; then
    set +e
    rm -Rf "$TARGET" 2>/dev/null
    set -e
fi

mkdir -p "$TARGET"
cd "$TARGET"

# Download file if needed
if [ "$URL" ]; then

    if has "wget"; then
        DOWNLOAD="wget --no-check-certificate -nc -nv"
    elif has "curl"; then
        DOWNLOAD="curl -sSOL"
    else
        echo "Error: you need curl or wget to proceed" >&2;
        exit 1
    fi

    echo "Downloading $URL"
    $DOWNLOAD "$URL"
    
    SOURCE="$TARGET/$(basename $URL)"
fi

# Make sure package is in the target folder
if [ `dirname $SOURCE` != $TARGET ]; then
    cp -a "$SOURCE" "$TARGET"
    SOURCE="$TARGET/$(basename $SOURCE)"
fi

# Unpack source
echo -n "Unpacking $SOURCE"
tar -zxf "$SOURCE"
echo " [Done]"

# Delete package
rm -Rf $SOURCE

# Move directory
if [ "$DIR" ]; then
    echo -n "Merging $TARGET/$DIR in $TARGET"
    mv "$DIR/"* .
    set +e
    mv "$DIR/."* . 2>/dev/null
    set -e
    rmdir "$DIR"
    echo " [Done]"
fi