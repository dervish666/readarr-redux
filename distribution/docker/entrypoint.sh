#!/bin/sh
# Container entrypoint, same contract as the linuxserver.io image.
# Started as root (the default): hand /config to PUID:PGID, then run Readarr as that user, never as root.
# Started with --user: run as that user and leave ownership alone.
set -e

umask "${UMASK:-022}"

if [ "$(id -u)" = "0" ]; then
    PUID="${PUID:-1000}"
    PGID="${PGID:-1000}"

    # Only entries not already owned by PUID:PGID are touched, so later starts cost nothing on a big /config
    if ! find /config \( ! -user "$PUID" -o ! -group "$PGID" \) -exec chown "$PUID:$PGID" {} +; then
        echo "Could not give everything under /config to $PUID:$PGID, Readarr may not be able to write there" >&2
    fi

    exec setpriv --reuid="$PUID" --regid="$PGID" --clear-groups /app/bin/Readarr -nobrowser -data=/config "$@"
fi

exec /app/bin/Readarr -nobrowser -data=/config "$@"
