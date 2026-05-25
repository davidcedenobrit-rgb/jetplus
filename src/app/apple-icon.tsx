import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#0f0f0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Líneas rojas de velocidad — estilo La Oriental */}
        <div style={{ position: 'absolute', left: 14, top: 52, width: 34, height: 10, background: '#D31F2A', transform: 'skewX(-18deg)', display: 'flex', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 10, top: 72, width: 44, height: 14, background: '#D31F2A', transform: 'skewX(-18deg)', display: 'flex', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 14, top: 96, width: 34, height: 10, background: '#D31F2A', transform: 'skewX(-18deg)', display: 'flex', borderRadius: 2 }} />
        {/* Texto principal */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: 28 }}>
          <span style={{ color: 'white', fontSize: 68, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1, letterSpacing: '-3px', display: 'flex' }}>
            LO
          </span>
          <span style={{ color: '#D31F2A', fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: '4px', marginTop: 2, display: 'flex' }}>
            CDM
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
