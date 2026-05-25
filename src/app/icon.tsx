import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0f0f0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Líneas rojas de velocidad */}
        <div style={{ position: 'absolute', left: 2, top: 8, width: 6, height: 2, background: '#D31F2A', transform: 'skewX(-20deg)', display: 'flex' }} />
        <div style={{ position: 'absolute', left: 1, top: 13, width: 8, height: 2.5, background: '#D31F2A', transform: 'skewX(-20deg)', display: 'flex' }} />
        <div style={{ position: 'absolute', left: 2, top: 19, width: 6, height: 2, background: '#D31F2A', transform: 'skewX(-20deg)', display: 'flex' }} />
        {/* Texto LO */}
        <span style={{ color: 'white', fontSize: 13, fontWeight: 800, fontFamily: 'sans-serif', marginLeft: 6, letterSpacing: '-0.5px', display: 'flex' }}>
          LO
        </span>
      </div>
    ),
    { ...size }
  )
}
