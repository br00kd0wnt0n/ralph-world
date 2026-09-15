#!/usr/bin/env bash
# Builds two short synthetic HLS streams shaped like the broadcaster's output, for
# e2e/tv-vertical-detector.spec.ts (the pixel-based orientation fallback):
#   portrait/  — a 9:16 test pattern padded into 1280x720 exactly as the transcoder
#                does it (405x720 strip between black pillars)
#   landscape/ — a plain 16:9 test pattern (control)
# Needs ffmpeg. Output goes to e2e/fixtures/synth-hls/out/ (gitignored). Then:
#   node e2e/fixtures/synth-hls/serve.mjs e2e/fixtures/synth-hls/out 8099
#   SYNTH_HLS_BASE=http://localhost:8099 npx playwright test e2e/tv-vertical-detector.spec.ts
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/out"
mkdir -p "$out/portrait" "$out/landscape"
common=(-c:v libx264 -preset ultrafast -g 48 -keyint_min 48 -sc_threshold 0 -pix_fmt yuv420p -c:a aac -b:a 64k
        -f hls -hls_time 2 -hls_playlist_type vod)
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=1080x1920:rate=24" -f lavfi -i "sine=frequency=440:sample_rate=48000" -t 120 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black" \
  "${common[@]}" -hls_segment_filename "$out/portrait/seg%03d.ts" "$out/portrait/stream.m3u8"
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=1920x1080:rate=24" -f lavfi -i "sine=frequency=440:sample_rate=48000" -t 120 \
  -vf "scale=1280:720" \
  "${common[@]}" -hls_segment_filename "$out/landscape/seg%03d.ts" "$out/landscape/stream.m3u8"
echo "synthetic streams written to $out"
