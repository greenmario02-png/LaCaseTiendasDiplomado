import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "PC Tienda API",
      version: "0.1.0",
      description:
        "API REST del marketplace multi-vendedor LaCase. " +
        "Los datos de esta instancia son sintéticos, generados con fines de prueba.",
    },
    servers: [{ url: "/api" }],
    tags: [
      { name: "auth", description: "Autenticación" },
      { name: "products", description: "Catálogo de productos" },
      { name: "cart", description: "Carrito de compras" },
      { name: "orders", description: "Pedidos" },
      { name: "admin", description: "Panel de administración" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
}
