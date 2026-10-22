#!/bin/sh
# Prints READARRVERSION for a release tag build: v1.2.3 (or v1.2.3-rc.1) becomes 1.2.3.<run number>.
# The app needs four numeric parts, Major below 10 and Revision at or below 10000 (see src/Directory.Build.props).
set -e

tag="${GITHUB_REF_NAME#v}"
version="${tag%%-*}"

case "$version" in
    [0-9].[0-9]*.[0-9]*) ;;
    *) echo "Release tags must look like v1.2.3 with a major version below 10, got $GITHUB_REF_NAME" >&2; exit 1 ;;
esac

echo "READARRVERSION=$version.$GITHUB_RUN_NUMBER"
