#!/usr/bin/env bash

set -euo pipefail

platform="linux/amd64"
tag="course-demo:latest"
output="--load"

usage() {
  cat <<'EOF'
Usage: scripts/build-image.sh [options]

Build the application image with Docker Buildx.

Options:
  --platform <platforms>  Target platform(s), default: linux/amd64
  --tag <image:tag>       Image name and tag, default: course-demo:latest
  --push                  Push the image (required for multi-platform builds)
  --no-load               Leave the result in the Buildx cache only
  -h, --help              Show this help

Examples:
  scripts/build-image.sh
  scripts/build-image.sh --platform linux/arm64 --tag course-demo:arm64
  scripts/build-image.sh --platform linux/amd64,linux/arm64 --tag registry.example.com/course-demo:latest --push
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      platform="${2:?--platform requires a value}"
      shift 2
      ;;
    --tag)
      tag="${2:?--tag requires a value}"
      shift 2
      ;;
    --push)
      output="--push"
      shift
      ;;
    --no-load)
      output=""
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$platform" == *,* && "$output" == "--load" ]]; then
  echo "Multi-platform builds cannot use --load; add --push or --no-load." >&2
  exit 2
fi

command=(
  docker buildx build
  --platform "$platform"
  --tag "$tag"
  --file infra/Dockerfile
)

if [[ -n "$output" ]]; then
  command+=("$output")
fi

command+=(.)

echo "Building $tag for $platform"
"${command[@]}"
