import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#D31F2A',
          borderRadius: 102,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 200,
            fontWeight: 800,
            letterSpacing: '-6px',
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          LO
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 58,
            fontWeight: 600,
            letterSpacing: '10px',
            fontFamily: 'sans-serif',
            marginTop: 12,
          }}
        >
          CDM
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
