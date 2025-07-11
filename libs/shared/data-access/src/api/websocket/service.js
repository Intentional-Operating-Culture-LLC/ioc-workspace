// WebSocket service wrapper for API consistency
import { WebSocketService as CoreWebSocketService } from '../../services/WebSocketService';

export class WebSocketService extends CoreWebSocketService {
  constructor(supabase) {
    super(supabase);
  }

  // Add any API-specific wrapper methods here if needed
}