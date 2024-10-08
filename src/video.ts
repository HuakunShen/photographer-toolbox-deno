// @ts-types="npm:@types/fluent-ffmpeg@2.1.26"
import ffmpeg from "npm:fluent-ffmpeg@2.1.3";
import type { DefaultVideoMetadata, VideoMetadata } from "./types/video.ts";
import { parseFrameRate, stringToNumber } from "./utils.ts";

/**
 * Turn `ffmpeg.ffprobe` into a promise
 * @param videoPath 
 * @returns 
 */
export function ffprobe(videoPath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}

/**
 * Run ffprobe on video file and return useful metadata
 * @param videoPath 
 * @returns 
 */
export function readVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return ffprobe(videoPath).then((metadata) => {
    return {
      streams: metadata.streams.map((stream) => ({
        width: stream.width,
        height: stream.height,
        bitRate: stringToNumber(stream.bit_rate),
        profile: stream.profile,
        bitsPerRawSample: stream.bits_per_raw_sample,
        bitsPerSample: stream.bits_per_sample,
        rFrameRate: stream.r_frame_rate,
        avgFrameRate: stream.avg_frame_rate,
        numericAvgFrameRate: parseFrameRate(stream.avg_frame_rate ?? "0/1"),
        codec: stream.codec_name,
        codecLongName: stream.codec_long_name,
        codecType: stream.codec_type,
        timeBase: stream.time_base,
        codecTag: stream.codec_tag,
        codecTagString: stream.codec_tag_string,
        duration: stringToNumber(stream.duration),
        startTime: stream.start_time,
        numberOfFrames: stringToNumber(stream.nb_frames),
      })),
      filePath: videoPath,
      numberOfStreams: metadata.streams.length,
      formatName: metadata.format.format_name,
      formatLongName: metadata.format.format_long_name,
      duration: metadata.format.duration,
      size: metadata.format.size,
      bitRate: metadata.format.bit_rate,
      startTime: metadata.format.start_time,
      tags: metadata.format.tags,
      encoder: metadata.format.encoder ?? metadata.format.tags?.encoder,
      creationTime:
        metadata.format.creation_time ?? metadata.format.tags?.creation_time,
    };
  });
}

/**
 * Try to find the main stream from video file and return useful metadata as a flat object
 * @example
 * ```ts
 * import { video } from "./mod.ts";
 * const videoPath =
 * "/Volumes/EditDrive/2024-QC/DJI-mini-4/DJI_20241004162411_0110_D.MP4";
 * video.readMainVideoMetadata(videoPath).then(console.log);
 * ```
 * @param videoPath
 * @returns
 */
export function readMainVideoMetadata(
  videoPath: string
): Promise<DefaultVideoMetadata | null> {
  return readVideoMetadata(videoPath).then((metadata) => {
    const videoStreams = metadata.streams.filter(
      (s) => s.codecType === "video"
    );
    if (videoStreams.length === 0) {
      return null;
    }
    const mainVideoStream = videoStreams.sort((a, b) =>
      a.numericAvgFrameRate && b.numericAvgFrameRate
        ? b.numericAvgFrameRate - a.numericAvgFrameRate
        : 0
    )[0];
    const result = {
      ...metadata,
      ...mainVideoStream,
    };
    const { streams: _streams, tags: _tags, ...restMetadata } = result;
    return restMetadata;
  });
}
