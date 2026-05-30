import { Warehouse } from "../types";

export const warehouses: Warehouse[] = [
  {
    id: 1,
    name: "Asosiy Ombor",
    location: "Chilonzor tumani, Qoʻshbegi ko'chasi 12",
    manager: "Sherzod Nazarov",
    phone: "+998901234572",
    totalProducts: 18,
    totalValue: 450_000_000,
    isActive: true,
  },
  {
    id: 2,
    name: "Sharqiy Ombor",
    location: "Mirzo Ulugbek tumani, Temur yoʻli 45",
    manager: "Firdavs Xoliqov",
    phone: "+998901234580",
    totalProducts: 12,
    totalValue: 320_000_000,
    isActive: true,
  },
  {
    id: 3,
    name: "Shimoliy Ombor",
    location: "Yunusobod tumani, Amir Temur prospekti 88",
    manager: "Nilufar Sobirov",
    phone: "+998901234581",
    totalProducts: 8,
    totalValue: 180_000_000,
    isActive: false,
  },
];
