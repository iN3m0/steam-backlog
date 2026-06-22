interface NotificationProps {
  msg: string
  type: 'success' | 'error'
}

export default function Notification({ msg, type }: NotificationProps) {
  return (
    <div className={`notification notification-${type}`}>
      {type === 'success' ? '✓ ' : '✕ '}
      {msg}
    </div>
  )
}
