import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#D31F2A',
          borderRadius: 36,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 72,
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
            fontSize: 20,
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
    { ...size }
  )
}
