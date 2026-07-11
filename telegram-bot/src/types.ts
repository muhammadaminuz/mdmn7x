import { Scenes } from "telegraf";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface CustomerProfile {
  id: number;
  companyName: string;
  ownerName: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  debt: number;
  balance: number;
  status: string;
  agentId: number;
  agentName: string;
  agentPhone: string;
}

// Scene-scoped data: lives under ctx.session.__scenes and is wiped whenever
// ctx.scene.leave() runs, which is exactly what we want for an in-progress cart.
export interface OrderSceneData extends Scenes.SceneSessionData {
  cart?: CartItem[];
  category?: string;
  pendingProductId?: number;
}

// Top-level session: the linked customer must survive scene leaves/resets, so it
// lives alongside __scenes rather than inside the scene-scoped data above.
export interface BotSession extends Scenes.SceneSession<OrderSceneData> {
  customer?: CustomerProfile;
}

export interface BotContext extends Scenes.SceneContext<OrderSceneData> {
  session: BotSession;
}
