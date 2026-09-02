/**
 * Minimal image buffers whose magic bytes file-type recognises. They are not
 * viewable pictures; they only need the right signature.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunk(name: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(name, "ascii"), data, Buffer.alloc(4)]);
}

/** A PNG with IHDR and IEND chunks, padded with `padding` extra bytes. */
export function pngBuffer(padding = 0): Buffer {
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", Buffer.alloc(13)),
    pngChunk("IEND", Buffer.alloc(0)),
    Buffer.alloc(padding),
  ]);
}

export function jpegBuffer(): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xdb]), Buffer.alloc(64)]);
}

export function webpBuffer(): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(40);
  return Buffer.concat([Buffer.from("RIFF", "ascii"), size, Buffer.from("WEBPVP8 ", "ascii"), Buffer.alloc(32)]);
}

export function gifBuffer(): Buffer {
  return Buffer.concat([Buffer.from("GIF89a", "ascii"), Buffer.alloc(32)]);
}

export function textBuffer(): Buffer {
  return Buffer.from("this is not an image at all, just text pretending to be one\n", "utf8");
}
