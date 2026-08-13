import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: '#0f0f0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 38,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Líneas rojas de velocidad */}
        <div style={{ position: 'absolute', left: 16, top: 56, width: 36, height: 11, background: '#D31F2A', transform: 'skewX(-18deg)', display: 'flex', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 11, top: 77, width: 46, height: 15, background: '#D31F2A', transform: 'skewX(-18deg)', display: 'flex', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 16, top: 102, width: 36, height: 11, background: '#D31F2A', transform: 'skewX(-18deg)', display: 'flex', borderRadius: 2 }} />
        {/* Texto */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: 30 }}>
          <span style={{ color: 'white', fontSize: 72, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1, letterSpacing: '-3px', display: 'flex' }}>
            JP
          </span>
          <span style={{ color: '#D31F2A', fontSize: 21, fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: '4px', marginTop: 2, display: 'flex' }}>
            CDM
          </span>
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
