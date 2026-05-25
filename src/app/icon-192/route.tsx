import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#D31F2A',
          borderRadius: 38,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: '-2px',
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          LO
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '3px',
            fontFamily: 'sans-serif',
            marginTop: 6,
          }}
        >
          CDM
        </span>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
