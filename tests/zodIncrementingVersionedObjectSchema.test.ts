import { z } from "zod";
import { createIncrementingVersionedObjectSchema } from "../src/zodIncrementingVersionedObjectSchema";

function createBasicPersonSchema() {
  return z.object({
    name: z.string(),
    age: z.number(),
  });
}

test("not adding any versions behaves as expected", () => {
  const versionedPersonSchema = createIncrementingVersionedObjectSchema(createBasicPersonSchema());
  expect(versionedPersonSchema.versionedSchema.parse({ name: "Alice", age: 42, schemaVersion: 0 })).toEqual({
    name: "Alice",
    age: 42,
    schemaVersion: 0,
  });
  expect(() => versionedPersonSchema.versionedSchema.parse({ name: "Alice", age: 42, schemaVersion: 1 })).toThrow();
});

test("adding a version works as expected", () => {
  const employeeSchema = createIncrementingVersionedObjectSchema(createBasicPersonSchema()).addVersion(
    (previousSchema) =>
      previousSchema.extend({
        employeeId: z.string(),
      }),
    (data) => ({ ...data, employeeId: "123" })
  );

  expect(employeeSchema.versionedSchema.parse({ name: "Alice", age: 42, employeeId: "xxx", schemaVersion: 1 })).toEqual(
    {
      name: "Alice",
      age: 42,
      employeeId: "xxx",
      schemaVersion: 1,
    }
  );

  expect(employeeSchema.versionedSchema.parse({ name: "Alice", age: 42, schemaVersion: 0 })).toEqual({
    name: "Alice",
    age: 42,
    employeeId: "123",
    schemaVersion: 1,
  });

  expect(() => employeeSchema.versionedSchema.parse({ name: "Alice", age: 42, schemaVersion: 1 })).toThrow();
});

test("typescript errors", () => {
  const employeeSchema = createIncrementingVersionedObjectSchema(createBasicPersonSchema()).addVersion(
    (previousSchema) =>
      previousSchema.extend({
        employeeId: z.string(),
      }),
    (data) => ({ ...data, employeeId: "123" })
  );

  const employee: z.infer<typeof employeeSchema.versionedSchema> = {
    name: "Alice",
    age: 42,
    // @ts-expect-error
    schemaVersion: 0,
  };

  // @ts-expect-error
  const employee2: z.infer<typeof employeeSchema.versionedSchema> = {
    name: "Alice",
    age: 42,
    schemaVersion: 1,
  };
});

test("starting fron a non-zero version", () => {
  const employeeSchema = createIncrementingVersionedObjectSchema(createBasicPersonSchema(), 1).addVersion(
    (previousSchema) =>
      previousSchema.extend({
        employeeId: z.string(),
      }),
    (data) => ({ ...data, employeeId: "123" })
  );

  expect(employeeSchema.versionedSchema.parse({ name: "Alice", age: 42, employeeId: "xxx", schemaVersion: 2 })).toEqual(
    {
      name: "Alice",
      age: 42,
      employeeId: "xxx",
      schemaVersion: 2,
    }
  );

  expect(employeeSchema.versionedSchema.parse({ name: "Alice", age: 42, schemaVersion: 1 })).toEqual({
    name: "Alice",
    age: 42,
    employeeId: "123",
    schemaVersion: 2,
  });

  expect(() => employeeSchema.versionedSchema.parse({ name: "Alice", age: 42, schemaVersion: 0 })).toThrow();
  expect(() => employeeSchema.versionedSchema.parse({ name: "Alice", age: 42 })).toThrow();
});
