/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreatePricingInput = {
  id?: string | null,
  userId: string,
  product?: string | null,
  demandForecast?: string | null,
  webScrap?: string | null,
  marginAnalysis?: string | null,
  personalizedPricing?: string | null,
  botResponses?: string | null,
  status?: string | null,
};

export type ModelPricingConditionInput = {
  userId?: ModelIDInput | null,
  product?: ModelStringInput | null,
  demandForecast?: ModelStringInput | null,
  webScrap?: ModelStringInput | null,
  marginAnalysis?: ModelStringInput | null,
  botResponses?: ModelStringInput | null,
  status?: ModelStringInput | null,
  and?: Array< ModelPricingConditionInput | null > | null,
  or?: Array< ModelPricingConditionInput | null > | null,
  not?: ModelPricingConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
  _null = "_null",
}


export type ModelSizeInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
};

export type ModelStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export type Pricing = {
  __typename: "Pricing",
  id: string,
  userId: string,
  product?: string | null,
  demandForecast?: string | null,
  webScrap?: string | null,
  marginAnalysis?: string | null,
  personalizedPricing?: string | null,
  botResponses?: string | null,
  status?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdatePricingInput = {
  id: string,
  userId?: string | null,
  product?: string | null,
  demandForecast?: string | null,
  webScrap?: string | null,
  marginAnalysis?: string | null,
  personalizedPricing?: string | null,
  botResponses?: string | null,
  status?: string | null,
};

export type DeletePricingInput = {
  id: string,
};

export type ModelPricingFilterInput = {
  id?: ModelIDInput | null,
  userId?: ModelIDInput | null,
  product?: ModelStringInput | null,
  demandForecast?: ModelStringInput | null,
  webScrap?: ModelStringInput | null,
  marginAnalysis?: ModelStringInput | null,
  botResponses?: ModelStringInput | null,
  status?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelPricingFilterInput | null > | null,
  or?: Array< ModelPricingFilterInput | null > | null,
  not?: ModelPricingFilterInput | null,
};

export type ModelPricingConnection = {
  __typename: "ModelPricingConnection",
  items:  Array<Pricing | null >,
  nextToken?: string | null,
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}


export type ModelSubscriptionPricingFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  product?: ModelSubscriptionStringInput | null,
  demandForecast?: ModelSubscriptionStringInput | null,
  webScrap?: ModelSubscriptionStringInput | null,
  marginAnalysis?: ModelSubscriptionStringInput | null,
  botResponses?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionPricingFilterInput | null > | null,
  or?: Array< ModelSubscriptionPricingFilterInput | null > | null,
  userId?: ModelStringInput | null,
};

export type ModelSubscriptionIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type CreatePricingMutationVariables = {
  input: CreatePricingInput,
  condition?: ModelPricingConditionInput | null,
};

export type CreatePricingMutation = {
  createPricing?:  {
    __typename: "Pricing",
    id: string,
    userId: string,
    product?: string | null,
    demandForecast?: string | null,
    webScrap?: string | null,
    marginAnalysis?: string | null,
  personalizedPricing?: string | null,
    botResponses?: string | null,
    status?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdatePricingMutationVariables = {
  input: UpdatePricingInput,
  condition?: ModelPricingConditionInput | null,
};

export type UpdatePricingMutation = {
  updatePricing?:  {
    __typename: "Pricing",
    id: string,
    userId: string,
    product?: string | null,
    demandForecast?: string | null,
    webScrap?: string | null,
    marginAnalysis?: string | null,
  personalizedPricing?: string | null,
    botResponses?: string | null,
    status?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeletePricingMutationVariables = {
  input: DeletePricingInput,
  condition?: ModelPricingConditionInput | null,
};

export type DeletePricingMutation = {
  deletePricing?:  {
    __typename: "Pricing",
    id: string,
    userId: string,
    product?: string | null,
    demandForecast?: string | null,
    webScrap?: string | null,
    marginAnalysis?: string | null,
  personalizedPricing?: string | null,
    botResponses?: string | null,
    status?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ResolverLambdaMutationVariables = {
  args?: string | null,
};

export type ResolverLambdaMutation = {
  resolverLambda?: string | null,
};

export type GetPricingQueryVariables = {
  id: string,
};

export type GetPricingQuery = {
  getPricing?:  {
    __typename: "Pricing",
    id: string,
    userId: string,
    product?: string | null,
    demandForecast?: string | null,
    webScrap?: string | null,
    marginAnalysis?: string | null,
  personalizedPricing?: string | null,
    botResponses?: string | null,
    status?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListPricingsQueryVariables = {
  filter?: ModelPricingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListPricingsQuery = {
  listPricings?:  {
    __typename: "ModelPricingConnection",
    items:  Array< {
      __typename: "Pricing",
      id: string,
      userId: string,
      product?: string | null,
      demandForecast?: string | null,
      webScrap?: string | null,
      marginAnalysis?: string | null,
  personalizedPricing?: string | null,
      botResponses?: string | null,
      status?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type PricingByUserIdQueryVariables = {
  userId: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelPricingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type PricingByUserIdQuery = {
  pricingByUserId?:  {
    __typename: "ModelPricingConnection",
    items:  Array< {
      __typename: "Pricing",
      id: string,
      userId: string,
      product?: string | null,
      demandForecast?: string | null,
      webScrap?: string | null,
      marginAnalysis?: string | null,
  personalizedPricing?: string | null,
      botResponses?: string | null,
      status?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type OnCreatePricingSubscriptionVariables = {
  filter?: ModelSubscriptionPricingFilterInput | null,
  userId?: string | null,
};

export type OnCreatePricingSubscription = {
  onCreatePricing?:  {
    __typename: "Pricing",
    id: string,
    userId: string,
    product?: string | null,
    demandForecast?: string | null,
    webScrap?: string | null,
    marginAnalysis?: string | null,
  personalizedPricing?: string | null,
    botResponses?: string | null,
    status?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdatePricingSubscriptionVariables = {
  filter?: ModelSubscriptionPricingFilterInput | null,
  userId?: string | null,
};

export type OnUpdatePricingSubscription = {
  onUpdatePricing?:  {
    __typename: "Pricing",
    id: string,
    userId: string,
    product?: string | null,
    demandForecast?: string | null,
    webScrap?: string | null,
    marginAnalysis?: string | null,
  personalizedPricing?: string | null,
    botResponses?: string | null,
    status?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeletePricingSubscriptionVariables = {
  filter?: ModelSubscriptionPricingFilterInput | null,
  userId?: string | null,
};

export type OnDeletePricingSubscription = {
  onDeletePricing?:  {
    __typename: "Pricing",
    id: string,
    userId: string,
    product?: string | null,
    demandForecast?: string | null,
    webScrap?: string | null,
    marginAnalysis?: string | null,
  personalizedPricing?: string | null,
    botResponses?: string | null,
    status?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnPricingByIdSubscriptionVariables = {
  id: string,
};

export type OnPricingByIdSubscription = {
  onPricingById?:  {
    __typename: "Pricing",
    id: string,
    userId: string,
    product?: string | null,
    demandForecast?: string | null,
    webScrap?: string | null,
    marginAnalysis?: string | null,
  personalizedPricing?: string | null,
    botResponses?: string | null,
    status?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};
