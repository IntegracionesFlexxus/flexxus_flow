/**
 * Specification Pattern
 * Sprint 4 - Patrón Specification para queries complejas
 */

/**
 * Base Specification Interface
 */
export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
  toExpression?(): any;
}

/**
 * Abstract Base Specification
 */
export abstract class BaseSpecification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
  }

  toExpression?(): any {
    return null;
  }
}

/**
 * AND Specification
 */
export class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: ISpecification<T>,
    private right: ISpecification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

/**
 * OR Specification
 */
export class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: ISpecification<T>,
    private right: ISpecification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

/**
 * NOT Specification
 */
export class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private spec: ISpecification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }
}

/**
 * Field Specification - Check specific field value
 */
export class FieldSpecification<T> extends BaseSpecification<T> {
  constructor(
    private field: keyof T,
    private value: any
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return candidate[this.field] === this.value;
  }
}

/**
 * Null Specification - Check if field is null
 */
export class NullSpecification<T> extends BaseSpecification<T> {
  constructor(private field: keyof T) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return candidate[this.field] === null || candidate[this.field] === undefined;
  }
}

/**
 * Date Range Specification
 */
export class DateRangeSpecification<T> extends BaseSpecification<T> {
  constructor(
    private field: keyof T,
    private startDate: Date,
    private endDate: Date
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    const fieldValue = candidate[this.field];
    if (!(fieldValue instanceof Date)) return false;
    return fieldValue >= this.startDate && fieldValue <= this.endDate;
  }
}

/**
 * Specification Builder - Fluent interface
 */
export class SpecificationBuilder<T> {
  private spec?: ISpecification<T>;

  where(field: keyof T, value: any): this {
    const newSpec = new FieldSpecification(field, value);
    this.spec = this.spec ? this.spec.and(newSpec) : newSpec;
    return this;
  }

  whereNull(field: keyof T): this {
    const newSpec = new NullSpecification(field);
    this.spec = this.spec ? this.spec.and(newSpec) : newSpec;
    return this;
  }

  whereDateRange(field: keyof T, startDate: Date, endDate: Date): this {
    const newSpec = new DateRangeSpecification(field, startDate, endDate);
    this.spec = this.spec ? this.spec.and(newSpec) : newSpec;
    return this;
  }

  and(spec: ISpecification<T>): this {
    this.spec = this.spec ? this.spec.and(spec) : spec;
    return this;
  }

  or(spec: ISpecification<T>): this {
    this.spec = this.spec ? this.spec.or(spec) : spec;
    return this;
  }

  build(): ISpecification<T> {
    if (!this.spec) {
      throw new Error('No specification has been built');
    }
    return this.spec;
  }
}

/**
 * Factory function to create a specification builder
 */
export function specification<T>(): SpecificationBuilder<T> {
  return new SpecificationBuilder<T>();
}
