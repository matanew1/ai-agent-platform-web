type NoticeProps = { message: string; onDismiss: () => void };

export function Notice({ message, onDismiss }: NoticeProps) {
  return (
    <div className="notice" role="alert">
      <span>{message}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
