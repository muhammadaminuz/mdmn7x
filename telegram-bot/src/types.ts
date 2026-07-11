import { Scenes } from "telegraf";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface CustomerProfile {
  id: number;
  telegramChatId: string;
  companyName: string;
  ownerName: string;
  phone: string;
  address: string | null;
}

// New-product wizard state (admin flow).
export interface NewProductDraft {
  name?: string;
  category?: string;
  price?: number;
}

// Scene-scoped data: lives under ctx.session.__scenes and is wiped whenever
// ctx.scene.leave() runs, which is exactly what we want for in-progress forms.
export interface BotSceneData extends Scenes.SceneSessionData {
  cart?: CartItem[];
  category?: string;
  pendingProductId?: number;
  registerPhone?: string;
  registerCompanyName?: string;
  newProduct?: NewProductDraft;
}

// Top-level session: the linked customer must survive scene leaves/resets, so it
// lives alongside __scenes rather than inside the scene-scoped data above.
export interface BotSession extends Scenes.SceneSession<BotSceneData> {
  customer?: CustomerProfile;
}

export interface BotContext extends Scenes.SceneContext<BotSceneData> {
  session: BotSession;
}
