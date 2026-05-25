import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#0f0f0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 102,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Líneas rojas de velocidad — estilo La Oriental */}
        <div style={{ position: 'absolute', left: 42, top: 148, width: 96, height: 28, background: '#D31F2A', transform: 'skewX(-18deg)', display: 'flex', borderRadius: 4 }} />
        <div style={{ position: 'absolute', left: 28, top: 204, width: 124, height: 40, background: '#D31F2A', transform: 'skewX(-18deg)', display: 'flex', borderRadius: 4 }} />
        <div style={{ position: 'absolute', left: 42, top: 272, width: 96, height: 28, background: '#D31F2A', transform: 'skewX(-18deg)', display: 'flex', borderRadius: 4 }} />
        {/* Texto principal */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: 80 }}>
          <span style={{ color: 'white', fontSize: 192, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1, letterSpacing: '-8px', display: 'flex' }}>
            LO
          </span>
          <span style={{ color: '#D31F2A', fontSize: 56, fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: '12px', marginTop: 4, display: 'flex' }}>
            CDM
          </span>
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
