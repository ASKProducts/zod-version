import { z } from "zod";
import { createVersionedSchema } from "../src/zodVersionedSchema";

function createBasicPersonSchema() {
  return z.object({
    name: z.string(),
    age: z.number(),
  });
}
function createVersionedPersonSchema() {
  return createVersionedSchema(createBasicPersonSchema());
}
function createVersionedEmployeeSchema() {
  return createVersionedPersonSchema().addVersion(
    (previousSchema) =>
      previousSchema.extend({
        employeeId: z.string(),
      }),
    (data) => ({ ...data, employeeId: "123" })
  );
}

test("zod works as expected", () => {
  const basicPersonSchema = createBasicPersonSchema();
  expect(basicPersonSchema.parse({ name: "Alice", age: 42 })).toEqual({ name: "Alice", age: 42 });
  expect(() => basicPersonSchema.parse({ name: "Alice", age: "42" })).toThrow();
});

test("not adding any versions behaves as expected", () => {
  const versionedPersonSchema = createVersionedPersonSchema();
  expect(versionedPersonSchema.versionedSchema.parse({ name: "Alice", age: 42 })).toEqual({ name: "Alice", age: 42 });
  expect(() => versionedPersonSchema.versionedSchema.parse({ name: "Alice", age: "42" })).toThrow();
});

test("adding a version works as expected", () => {
  const employeeSchema = createVersionedEmployeeSchema();
  expect(employeeSchema.versionedSchema.parse({ name: "Alice", age: 42, employeeId: "xxx" })).toEqual({
    name: "Alice",
    age: 42,
    employeeId: "xxx",
  });
  expect(employeeSchema.directSchema.parse({ name: "Alice", age: 42, employeeId: "xxx" })).toEqual({
    name: "Alice",
    age: 42,
    employeeId: "xxx",
  });

  expect(employeeSchema.versionedSchema.parse({ name: "Alice", age: 42 })).toEqual({
    name: "Alice",
    age: 42,
    employeeId: "123",
  });
  expect(() => employeeSchema.directSchema.parse({ name: "Alice", age: "42" })).toThrow();
});

test("long schema with many fields", () => {
  const schema = createVersionedSchema(
    z.object({
      name: z.string(),
    })
  )
    .addVersion(
      (previousSchema) =>
        previousSchema.extend({
          age: z.number().min(0).max(150),
        }),
      (data) => ({ ...data, age: 42 })
    )
    .addVersion(
      (previousSchema) =>
        previousSchema.extend({
          isEmployee: z.boolean(),
        }),
      (data) => ({ ...data, isEmployee: true })
    )
    .addVersion(
      (previousSchema) =>
        previousSchema.extend({
          pets: z.array(z.string()),
        }),
      (data) => ({ ...data, pets: [] })
    );

  expect(schema.versionedSchema.parse({ name: "Alice", age: 50, isEmployee: false, pets: ["dog", "cat"] })).toEqual({
    name: "Alice",
    age: 50,
    isEmployee: false,
    pets: ["dog", "cat"],
  });

  expect(schema.versionedSchema.parse({ name: "Alice", age: 50, isEmployee: false })).toEqual({
    name: "Alice",
    age: 50,
    isEmployee: false,
    pets: [],
  });

  expect(schema.versionedSchema.parse({ name: "Alice", age: 50 })).toEqual({
    name: "Alice",
    age: 50,
    isEmployee: true,
    pets: [],
  });

  expect(schema.versionedSchema.parse({ name: "Alice" })).toEqual({
    name: "Alice",
    age: 42,
    isEmployee: true,
    pets: [],
  });
});

test("renaming a field", () => {
  const schema = createVersionedSchema(
    z.object({
      name: z.string(),
    })
  )
    .addVersion(
      (previousSchema) =>
        previousSchema.extend({
          age: z.number().min(0).max(150),
        }),
      (data) => ({ ...data, age: 42 })
    )
    .addVersion(
      (previousSchema) =>
        previousSchema.omit({ age: true }).extend({
          ageInYears: z.number().min(0).max(150),
        }),
      (data) => ({ ...data, ageInYears: data.age })
    );

  expect(schema.versionedSchema.parse({ name: "Alice", age: 50 })).toEqual({
    name: "Alice",
    ageInYears: 50,
  });
  expect(() => schema.directSchema.parse({ name: "Alice", age: 50 })).toThrow();
});

test("test typescript error", () => {
  const employeeSchema = createVersionedEmployeeSchema();
  type Employee = z.infer<typeof employeeSchema.versionedSchema>;
  // @ts-expect-error
  const employee: Employee = {
    name: "Alice",
    age: 42,
  };

  const employee2: Employee = {
    name: "Alice",
    age: 42,
    employeeId: "123",
  };
  expect(employee2).toEqual({ name: "Alice", age: 42, employeeId: "123" });
});
