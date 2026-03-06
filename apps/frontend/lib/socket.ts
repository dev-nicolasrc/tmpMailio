import { io, Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "@tmpmail/shared"

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000", {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  return socket
}
