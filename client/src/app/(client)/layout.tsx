import { WebSocketProvider } from "./WebSocketContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WebSocketProvider>{children}</WebSocketProvider>;
}
