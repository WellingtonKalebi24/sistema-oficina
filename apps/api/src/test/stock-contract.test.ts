import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createTenantWithAdmin, getAuditRows, loginAs, resetIdentityTables } from "./testData.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

let server: Server;
let baseUrl: string;

const logStream: DestinationStream = {
  write() {
    // keep stock contract tests quiet while exercising the logger seam
  },
};

type ApiData<T> = {
  data: T;
};

type ServiceBody = {
  basePrice: string;
  deactivatedAt: string | null;
  id: string;
  name: string;
  tenantId: string;
};

type CategoryBody = {
  deactivatedAt: string | null;
  id: string;
  name: string;
  tenantId: string;
};

type ProductBody = {
  availableQuantity: number;
  categoryId: string;
  id: string;
  lowStock: boolean;
  minimumStock: number;
  name: string;
  physicalQuantity: number;
  reservedQuantity: number;
  tenantId: string;
};

type SupplierBody = {
  deactivatedAt: string | null;
  documentNormalized: string | null;
  id: string;
  name: string;
  tenantId: string;
};

type PurchaseBody = {
  id: string;
  itemCount: number;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    stockMovementId: string;
    unitCost: string;
  }>;
  supplierId: string;
  tenantId: string;
  totalAmount: string;
};

type MovementBody = {
  balanceAfterPhysical: number;
  balanceAfterReserved: number;
  balanceAfterAvailable: number;
  id: string;
  productId: string;
  quantityDelta: number;
  sourceId: string | null;
  sourceKind: string;
  sourceLabel: string | null;
  type: string;
};

type ReservationBody = {
  cancelledAt: string | null;
  createdAt: string;
  id: string;
  productId: string;
  quantity: number;
  sourceId: string | null;
  sourceKind: string;
  sourceLabel: string | null;
  sourceReference: string | null;
  status: string;
  tenantId: string;
};

beforeAll(async () => {
  process.env.DATABASE_URL = connectionString;

  server = createServer(
    createApp({
      logStream,
      prisma,
    }),
  );

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not resolve test server address.");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await resetIdentityTables(prisma);
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await prisma.$disconnect();
});

describe("stock catalog API contract", () => {
  it("D-01 creates, edits, lists and deactivates service entries inside the authenticated tenant", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Servicos",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);

    const createResponse = await fetch(`${baseUrl}/stock/services`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        basePrice: "149.90",
        description: "Servico com checklist operacional",
        name: "Troca de oleo",
      }),
    });

    expect(createResponse.status).toBe(201);

    const created = (await createResponse.json()) as ApiData<ServiceBody>;

    expect(created.data).toMatchObject({
      basePrice: "149.90",
      deactivatedAt: null,
      name: "Troca de oleo",
      tenantId: fixture.tenantId,
    });

    const updateResponse = await fetch(`${baseUrl}/stock/services/${created.data.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        basePrice: "179.90",
        name: "Troca de oleo premium",
      }),
    });
    const listResponse = await fetch(`${baseUrl}/stock/services`, {
      headers: bearerHeaders(session.accessToken),
    });
    const deactivateResponse = await fetch(`${baseUrl}/stock/services/${created.data.id}`, {
      method: "DELETE",
      headers: bearerHeaders(session.accessToken),
    });
    const listAfterDeactivateResponse = await fetch(`${baseUrl}/stock/services`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(updateResponse.status).toBe(200);
    expect(listResponse.status).toBe(200);
    expect(deactivateResponse.status).toBe(204);
    expect(listAfterDeactivateResponse.status).toBe(200);

    const listBody = (await listResponse.json()) as ApiData<ServiceBody[]>;
    const afterDeactivateBody =
      (await listAfterDeactivateResponse.json()) as ApiData<ServiceBody[]>;

    expect(listBody.data.map((service) => service.id)).toContain(created.data.id);
    expect(afterDeactivateBody.data.map((service) => service.id)).not.toContain(created.data.id);
  });

  it("D-08 stores product minimum stock and returns calculated physical, reserved, available and low-stock values", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const category = await createCategory(headers, {
      name: "Filtros",
    });

    const productResponse = await fetch(`${baseUrl}/stock/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        categoryId: category.id,
        minimumStock: 2,
        name: "Filtro de oleo",
        salePrice: "49.90",
        sku: "FLT-001",
      }),
    });

    expect(productResponse.status).toBe(201);

    const product = (await productResponse.json()) as ApiData<ProductBody>;

    expect(product.data).toMatchObject({
      availableQuantity: 0,
      categoryId: category.id,
      lowStock: true,
      minimumStock: 2,
      name: "Filtro de oleo",
      physicalQuantity: 0,
      reservedQuantity: 0,
      tenantId: fixture.tenantId,
    });

    const updateProductResponse = await fetch(`${baseUrl}/stock/products/${product.data.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        minimumStock: 0,
        name: "Filtro de oleo atualizado",
      }),
    });
    const listResponse = await fetch(`${baseUrl}/stock/products`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(updateProductResponse.status).toBe(200);
    expect(listResponse.status).toBe(200);

    const updatedProduct = (await updateProductResponse.json()) as ApiData<ProductBody>;
    const listBody = (await listResponse.json()) as ApiData<ProductBody[]>;

    expect(updatedProduct.data.lowStock).toBe(false);
    expect(listBody.data.map((item) => item.id)).toContain(product.data.id);
  });

  it("D-03/D-04 keeps suppliers, categories and products isolated by tenant", async () => {
    const tenantA = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Estoque A",
    });
    const tenantB = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Estoque B",
    });
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const sessionB = await loginAs({ baseUrl }, tenantB.adminEmail, tenantB.adminPassword);
    const headersA = authHeaders(sessionA.accessToken);
    const headersB = authHeaders(sessionB.accessToken);
    const categoryA = await createCategory(headersA, {
      name: "Pecas tenant A",
    });
    const categoryB = await createCategory(headersB, {
      name: "Pecas tenant B",
    });
    const productB = await createProduct(headersB, {
      categoryId: categoryB.id,
      minimumStock: 1,
      name: "Produto tenant B",
    });
    const supplierB = await createSupplier(headersB, {
      document: "12.345.678/0001-99",
      name: "Fornecedor tenant B",
      phone: "(11) 3000-1000",
    });

    const crossCategoryProductResponse = await fetch(`${baseUrl}/stock/products`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        categoryId: categoryB.id,
        name: "Produto invasor",
      }),
    });
    const listProductsAResponse = await fetch(`${baseUrl}/stock/products`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const readProductBResponse = await fetch(`${baseUrl}/stock/products/${productB.id}`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const updateProductBResponse = await fetch(`${baseUrl}/stock/products/${productB.id}`, {
      method: "PATCH",
      headers: headersA,
      body: JSON.stringify({ name: "Cross tenant" }),
    });
    const readSupplierBResponse = await fetch(`${baseUrl}/stock/suppliers/${supplierB.id}`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const updateSupplierBResponse = await fetch(`${baseUrl}/stock/suppliers/${supplierB.id}`, {
      method: "PATCH",
      headers: headersA,
      body: JSON.stringify({ name: "Cross tenant" }),
    });
    const deactivateSupplierBResponse = await fetch(
      `${baseUrl}/stock/suppliers/${supplierB.id}`,
      {
        method: "DELETE",
        headers: bearerHeaders(sessionA.accessToken),
      },
    );

    expect(categoryA.tenantId).toBe(tenantA.tenantId);
    expect(supplierB.documentNormalized).toBe("12345678000199");
    expect(crossCategoryProductResponse.status).toBe(404);
    expect(readProductBResponse.status).toBe(404);
    expect(updateProductBResponse.status).toBe(404);
    expect(readSupplierBResponse.status).toBe(404);
    expect(updateSupplierBResponse.status).toBe(404);
    expect(deactivateSupplierBResponse.status).toBe(404);

    const productsA = (await listProductsAResponse.json()) as ApiData<ProductBody[]>;
    expect(productsA.data.map((product) => product.id)).not.toContain(productB.id);
  });

  it("D-06 writes concise audit rows for catalog mutations without raw notes or full documents", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const category = await createCategory(headers, {
      description: "Descricao operacional extensa que nao deve virar dump de auditoria",
      name: "Correias",
    });
    const product = await createProduct(headers, {
      categoryId: category.id,
      description: "Descricao longa de produto que nao deve ser persistida no payload",
      minimumStock: 3,
      name: "Correia dentada",
    });
    const supplier = await createSupplier(headers, {
      document: "98.765.432/0001-11",
      name: "Fornecedor Auditoria",
    });

    await fetch(`${baseUrl}/stock/products/${product.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: "Correia dentada atualizada" }),
    });
    await fetch(`${baseUrl}/stock/suppliers/${supplier.id}`, {
      method: "DELETE",
      headers: bearerHeaders(session.accessToken),
    });

    const auditRows = await getAuditRows(prisma);

    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "stock.categories.created",
        "stock.products.created",
        "stock.products.updated",
        "stock.suppliers.created",
        "stock.suppliers.deactivated",
      ]),
    );
    expect(JSON.stringify(auditRows.map((row) => row.payload))).not.toContain("Descricao longa");
    expect(JSON.stringify(auditRows.map((row) => row.payload))).not.toContain("98765432000111");
  });

  it("D-03/D-04/D-05/D-10 registers purchase items, entry movements and physical stock in one committed operation", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Compras",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const category = await createCategory(headers, { name: "Compra filtros" });
    const product = await createProduct(headers, {
      categoryId: category.id,
      minimumStock: 2,
      name: "Filtro combustivel",
      sku: "FLT-CMB-001",
    });
    const supplier = await createSupplier(headers, {
      name: "Fornecedor de Pecas",
    });

    const purchaseResponse = await fetch(`${baseUrl}/stock/purchases`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentNumber: "NF-1001",
        items: [
          {
            productId: product.id,
            quantity: 5,
            unitCost: "19.90",
          },
        ],
        purchasedAt: new Date("2026-07-22T12:00:00.000Z").toISOString(),
        supplierId: supplier.id,
      }),
    });

    expect(purchaseResponse.status).toBe(201);

    const purchase = (await purchaseResponse.json()) as ApiData<PurchaseBody>;
    const productAfterResponse = await fetch(`${baseUrl}/stock/products/${product.id}`, {
      headers: bearerHeaders(session.accessToken),
    });
    const movementsResponse = await fetch(`${baseUrl}/stock/movements?productId=${product.id}`, {
      headers: bearerHeaders(session.accessToken),
    });
    const auditRows = await getAuditRows(prisma);

    expect(purchase.data).toMatchObject({
      itemCount: 1,
      supplierId: supplier.id,
      tenantId: fixture.tenantId,
      totalAmount: "99.50",
    });
    expect(purchase.data.items[0]).toMatchObject({
      productId: product.id,
      quantity: 5,
      unitCost: "19.90",
    });

    const productAfter = (await productAfterResponse.json()) as ApiData<ProductBody>;
    expect(productAfter.data).toMatchObject({
      availableQuantity: 5,
      lowStock: false,
      physicalQuantity: 5,
      reservedQuantity: 0,
    });

    const movements = (await movementsResponse.json()) as ApiData<MovementBody[]>;
    expect(movements.data).toHaveLength(1);
    expect(movements.data[0]).toMatchObject({
      balanceAfterAvailable: 5,
      balanceAfterPhysical: 5,
      balanceAfterReserved: 0,
      productId: product.id,
      quantityDelta: 5,
      sourceId: purchase.data.id,
      sourceKind: "purchase",
      type: "entry",
    });

    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining(["stock.purchases.created", "stock.movements.entry"]),
    );
  });

  it("D-05/D-06/D-10 creates authorized exits and adjustments with source data, movement history and audit", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Movimentos",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const category = await createCategory(headers, { name: "Movimento filtros" });
    const product = await createProduct(headers, {
      categoryId: category.id,
      name: "Pastilha de freio",
    });
    const supplier = await createSupplier(headers, { name: "Fornecedor Movimento" });

    await createPurchase(headers, {
      items: [{ productId: product.id, quantity: 8, unitCost: "31.00" }],
      purchasedAt: new Date("2026-07-22T12:00:00.000Z").toISOString(),
      supplierId: supplier.id,
    });

    const exitResponse = await fetch(`${baseUrl}/stock/exits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        origin: "OS manual 100",
        productId: product.id,
        quantity: 3,
        sourceKind: "manual",
        sourceLabel: "Uso em servico",
      }),
    });
    const adjustmentResponse = await fetch(`${baseUrl}/stock/adjustments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: product.id,
        quantityDelta: -1,
        reason: "Conferencia fisica encontrou uma peca avariada",
        sourceKind: "inventory_count",
        sourceLabel: "Inventario 2026-07",
      }),
    });

    expect(exitResponse.status).toBe(201);
    expect(adjustmentResponse.status).toBe(201);

    const exitMovement = (await exitResponse.json()) as ApiData<MovementBody>;
    const adjustmentMovement = (await adjustmentResponse.json()) as ApiData<MovementBody>;
    const movementsResponse = await fetch(`${baseUrl}/stock/movements?productId=${product.id}`, {
      headers: bearerHeaders(session.accessToken),
    });
    const productAfterResponse = await fetch(`${baseUrl}/stock/products/${product.id}`, {
      headers: bearerHeaders(session.accessToken),
    });
    const auditRows = await getAuditRows(prisma);

    expect(exitMovement.data).toMatchObject({
      balanceAfterAvailable: 5,
      balanceAfterPhysical: 5,
      productId: product.id,
      quantityDelta: -3,
      sourceKind: "manual",
      sourceLabel: "Uso em servico",
      type: "exit",
    });
    expect(adjustmentMovement.data).toMatchObject({
      balanceAfterAvailable: 4,
      balanceAfterPhysical: 4,
      productId: product.id,
      quantityDelta: -1,
      sourceKind: "inventory_count",
      sourceLabel: "Inventario 2026-07",
      type: "adjustment",
    });

    const movements = (await movementsResponse.json()) as ApiData<MovementBody[]>;
    expect(movements.data.map((movement) => movement.type)).toEqual([
      "adjustment",
      "exit",
      "entry",
    ]);

    const productAfter = (await productAfterResponse.json()) as ApiData<ProductBody>;
    expect(productAfter.data).toMatchObject({
      availableQuantity: 4,
      physicalQuantity: 4,
      reservedQuantity: 0,
    });
    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining(["stock.movements.exit", "stock.movements.adjustment"]),
    );
    expect(JSON.stringify(auditRows.map((row) => row.payload))).not.toContain(
      "Conferencia fisica encontrou",
    );
  });

  it("D-03/D-04/D-05/STK-14 blocks foreign-tenant product and supplier IDs in purchase and stock writes", async () => {
    const tenantA = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Estoque Tenant A",
    });
    const tenantB = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Estoque Tenant B",
    });
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const sessionB = await loginAs({ baseUrl }, tenantB.adminEmail, tenantB.adminPassword);
    const headersA = authHeaders(sessionA.accessToken);
    const headersB = authHeaders(sessionB.accessToken);
    const categoryA = await createCategory(headersA, { name: "Tenant A" });
    const categoryB = await createCategory(headersB, { name: "Tenant B" });
    const productA = await createProduct(headersA, {
      categoryId: categoryA.id,
      name: "Produto A",
    });
    const productB = await createProduct(headersB, {
      categoryId: categoryB.id,
      name: "Produto B",
    });
    const supplierB = await createSupplier(headersB, { name: "Fornecedor B" });

    const foreignSupplierPurchase = await fetch(`${baseUrl}/stock/purchases`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        items: [{ productId: productA.id, quantity: 1, unitCost: "10.00" }],
        purchasedAt: new Date("2026-07-22T12:00:00.000Z").toISOString(),
        supplierId: supplierB.id,
      }),
    });
    const foreignProductPurchase = await fetch(`${baseUrl}/stock/purchases`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        items: [{ productId: productB.id, quantity: 1, unitCost: "10.00" }],
        purchasedAt: new Date("2026-07-22T12:00:00.000Z").toISOString(),
        supplierId: supplierB.id,
      }),
    });
    const foreignProductExit = await fetch(`${baseUrl}/stock/exits`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        origin: "Tentativa cross tenant",
        productId: productB.id,
        quantity: 1,
        sourceKind: "manual",
      }),
    });
    const foreignProductAdjustment = await fetch(`${baseUrl}/stock/adjustments`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        productId: productB.id,
        quantityDelta: 1,
        reason: "Tentativa cross tenant",
        sourceKind: "inventory_count",
      }),
    });

    expect(foreignSupplierPurchase.status).toBe(404);
    expect(foreignProductPurchase.status).toBe(404);
    expect(foreignProductExit.status).toBe(404);
    expect(foreignProductAdjustment.status).toBe(404);
  });

  it("D-04/D-05/D-10 reserves and cancels parts without changing physical stock", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Reservas",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const category = await createCategory(headers, { name: "Reserva filtros" });
    const product = await createProduct(headers, {
      categoryId: category.id,
      minimumStock: 3,
      name: "Sensor ABS",
    });
    const supplier = await createSupplier(headers, { name: "Fornecedor Reserva" });

    await createPurchase(headers, {
      items: [{ productId: product.id, quantity: 6, unitCost: "80.00" }],
      purchasedAt: new Date("2026-07-22T12:00:00.000Z").toISOString(),
      supplierId: supplier.id,
    });

    const reservationResponse = await fetch(`${baseUrl}/stock/reservations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: product.id,
        quantity: 4,
        sourceId: null,
        sourceKind: "quote",
        sourceLabel: "Orcamento manual",
        sourceReference: "ORC-2026-001",
      }),
    });

    expect(reservationResponse.status).toBe(201);

    const reservation = (await reservationResponse.json()) as ApiData<ReservationBody>;
    expect(reservation.data).toMatchObject({
      cancelledAt: null,
      productId: product.id,
      quantity: 4,
      sourceId: null,
      sourceKind: "quote",
      sourceLabel: "Orcamento manual",
      sourceReference: "ORC-2026-001",
      status: "active",
      tenantId: fixture.tenantId,
    });

    const productAfterReserveResponse = await fetch(`${baseUrl}/stock/products/${product.id}`, {
      headers: bearerHeaders(session.accessToken),
    });
    const activeListResponse = await fetch(`${baseUrl}/stock/reservations?status=active`, {
      headers: bearerHeaders(session.accessToken),
    });
    const movementsAfterReserveResponse = await fetch(
      `${baseUrl}/stock/movements?productId=${product.id}`,
      {
        headers: bearerHeaders(session.accessToken),
      },
    );

    expect(productAfterReserveResponse.status).toBe(200);
    expect(activeListResponse.status).toBe(200);
    expect(movementsAfterReserveResponse.status).toBe(200);

    const productAfterReserve = (await productAfterReserveResponse.json()) as ApiData<ProductBody>;
    const activeReservations = (await activeListResponse.json()) as ApiData<ReservationBody[]>;
    const movementsAfterReserve =
      (await movementsAfterReserveResponse.json()) as ApiData<MovementBody[]>;

    expect(productAfterReserve.data).toMatchObject({
      availableQuantity: 2,
      lowStock: true,
      physicalQuantity: 6,
      reservedQuantity: 4,
    });
    expect(activeReservations.data.map((item) => item.id)).toContain(reservation.data.id);
    expect(movementsAfterReserve.data[0]).toMatchObject({
      balanceAfterAvailable: 2,
      balanceAfterPhysical: 6,
      balanceAfterReserved: 4,
      productId: product.id,
      quantityDelta: 0,
      sourceKind: "quote",
      sourceLabel: "Orcamento manual",
      type: "reservation",
    });

    const cancelResponse = await fetch(
      `${baseUrl}/stock/reservations/${reservation.data.id}/cancel`,
      {
        method: "POST",
        headers,
      },
    );
    const doubleCancelResponse = await fetch(
      `${baseUrl}/stock/reservations/${reservation.data.id}/cancel`,
      {
        method: "POST",
        headers,
      },
    );

    expect(cancelResponse.status).toBe(200);
    expect(doubleCancelResponse.status).toBe(409);

    const cancelledReservation = (await cancelResponse.json()) as ApiData<ReservationBody>;
    const productAfterCancelResponse = await fetch(`${baseUrl}/stock/products/${product.id}`, {
      headers: bearerHeaders(session.accessToken),
    });
    const cancelledListResponse = await fetch(`${baseUrl}/stock/reservations?status=cancelled`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(cancelledReservation.data.status).toBe("cancelled");
    expect(cancelledReservation.data.cancelledAt).toEqual(expect.any(String));

    const productAfterCancel = (await productAfterCancelResponse.json()) as ApiData<ProductBody>;
    const cancelledReservations =
      (await cancelledListResponse.json()) as ApiData<ReservationBody[]>;

    expect(productAfterCancel.data).toMatchObject({
      availableQuantity: 6,
      lowStock: false,
      physicalQuantity: 6,
      reservedQuantity: 0,
    });
    expect(cancelledReservations.data.map((item) => item.id)).toContain(reservation.data.id);
  });

  it("D-04/D-05/D-10 rejects reservation create and cancel operations across tenants", async () => {
    const tenantA = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Reservas A",
    });
    const tenantB = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Reservas B",
    });
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const sessionB = await loginAs({ baseUrl }, tenantB.adminEmail, tenantB.adminPassword);
    const headersA = authHeaders(sessionA.accessToken);
    const headersB = authHeaders(sessionB.accessToken);
    const categoryA = await createCategory(headersA, { name: "Reserva tenant A" });
    const categoryB = await createCategory(headersB, { name: "Reserva tenant B" });
    const productA = await createProduct(headersA, {
      categoryId: categoryA.id,
      name: "Produto reserva A",
    });
    const productB = await createProduct(headersB, {
      categoryId: categoryB.id,
      name: "Produto reserva B",
    });
    const supplierB = await createSupplier(headersB, { name: "Fornecedor reserva B" });

    await createPurchase(headersB, {
      items: [{ productId: productB.id, quantity: 3, unitCost: "10.00" }],
      purchasedAt: new Date("2026-07-22T12:00:00.000Z").toISOString(),
      supplierId: supplierB.id,
    });

    const reservationBResponse = await fetch(`${baseUrl}/stock/reservations`, {
      method: "POST",
      headers: headersB,
      body: JSON.stringify({
        productId: productB.id,
        quantity: 1,
        sourceKind: "work_order",
        sourceReference: "OS-tenant-B",
      }),
    });
    expect(reservationBResponse.status).toBe(201);

    const reservationB = (await reservationBResponse.json()) as ApiData<ReservationBody>;
    const foreignProductReservation = await fetch(`${baseUrl}/stock/reservations`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        productId: productB.id,
        quantity: 1,
        sourceKind: "quote",
      }),
    });
    const foreignCancel = await fetch(
      `${baseUrl}/stock/reservations/${reservationB.data.id}/cancel`,
      {
        method: "POST",
        headers: headersA,
      },
    );
    const tenantAReservationsResponse = await fetch(`${baseUrl}/stock/reservations`, {
      headers: bearerHeaders(sessionA.accessToken),
    });

    expect(productA.tenantId).toBe(tenantA.tenantId);
    expect(foreignProductReservation.status).toBe(404);
    expect(foreignCancel.status).toBe(404);

    const tenantAReservations =
      (await tenantAReservationsResponse.json()) as ApiData<ReservationBody[]>;
    expect(tenantAReservations.data.map((item) => item.id)).not.toContain(reservationB.data.id);
  });
});

function bearerHeaders(accessToken: string): Record<string, string> {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    ...bearerHeaders(accessToken),
    "content-type": "application/json",
  };
}

async function createCategory(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<CategoryBody> {
  const response = await fetch(`${baseUrl}/stock/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  expect(response.status).toBe(201);

  const responseBody = (await response.json()) as ApiData<CategoryBody>;
  return responseBody.data;
}

async function createProduct(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<ProductBody> {
  const response = await fetch(`${baseUrl}/stock/products`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  expect(response.status).toBe(201);

  const responseBody = (await response.json()) as ApiData<ProductBody>;
  return responseBody.data;
}

async function createSupplier(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<SupplierBody> {
  const response = await fetch(`${baseUrl}/stock/suppliers`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  expect(response.status).toBe(201);

  const responseBody = (await response.json()) as ApiData<SupplierBody>;
  return responseBody.data;
}

async function createPurchase(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<PurchaseBody> {
  const response = await fetch(`${baseUrl}/stock/purchases`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  expect(response.status).toBe(201);

  const responseBody = (await response.json()) as ApiData<PurchaseBody>;
  return responseBody.data;
}
