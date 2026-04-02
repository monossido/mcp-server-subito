import { z } from "zod";

export const locationSchema = z.object({
  display: z.string(),
  town: z.string().nullable(),
  provinceName: z.string().nullable(),
  provinceCode: z.string().nullable(),
  regionName: z.string().nullable(),
});

export const attributesSchema = z.object({
  brand: z.string().nullable(),
  model: z.string().nullable(),
  variant: z.string().nullable(),
  condition: z.string().nullable(),
  year: z.string().nullable(),
  registration: z.string().nullable(),
  mileageText: z.string().nullable(),
  mileageKm: z.number().nullable(),
  fuel: z.string().nullable(),
  transmission: z.string().nullable(),
  bodyType: z.string().nullable(),
});

export const advertiserSchema = z.object({
  name: z.string(),
  type: z.enum(["private", "professional"]).nullable(),
  phone: z.string().nullable(),
});

export const listingSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.string().nullable(),
  priceAmount: z.number().nullable(),
  currency: z.enum(["EUR"]).nullable(),
  location: z.string(),
  locationData: locationSchema,
  url: z.string(),
  imageUrl: z.string().nullable(),
  imageCount: z.number(),
  date: z.string().nullable(),
  category: z.string().nullable(),
  advertiser: z.string().nullable(),
  sellerType: z.enum(["private", "professional"]).nullable(),
  listingType: z.string().nullable(),
  shipping: z.boolean(),
  attributes: attributesSchema,
});

export const listingDetailsSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  descriptionLines: z.array(z.string()),
  price: z.string().nullable(),
  priceAmount: z.number().nullable(),
  currency: z.enum(["EUR"]).nullable(),
  location: z.string(),
  locationData: locationSchema,
  date: z.string().nullable(),
  category: z.string().nullable(),
  categoryPath: z.array(z.string()),
  images: z.array(z.string()),
  imageCount: z.number(),
  advertiser: advertiserSchema.nullable(),
  sellerType: z.enum(["private", "professional"]).nullable(),
  features: z.record(z.string(), z.string()),
  attributes: attributesSchema,
  url: z.string(),
});
