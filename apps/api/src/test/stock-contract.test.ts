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
