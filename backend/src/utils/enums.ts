export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  DELIVERY_RIDER = 'delivery_rider',
  DELIVERY_MANAGER = 'delivery_manager',
  INVENTORY_MANAGER = 'inventory_manager',
  MARKETING_SPECIALIST = 'marketing_specialist',
  USER = 'user',
}

export enum AccountStatus {
  ACTIVE = 'active',
  UNVERIFIED = 'unverified',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

export enum ProductType {
  CASE = 'case',
  CPU = 'cpu',
  GPU = 'gpu',
  MOTHERBOARD = 'motherboard',
  RAM = 'ram',
  STORAGE = 'storage',
  PSU = 'psu',
  COOLER = 'cooler',
  MONITOR = 'monitor',
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  HEADSET = 'headset',
  CASE_FAN = 'case_fan',
  EXTRAS = 'extras',
}