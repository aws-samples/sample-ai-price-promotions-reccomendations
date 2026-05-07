/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getPricing = /* GraphQL */ `query GetPricing($id: ID!) {
  getPricing(id: $id) {
    id
    userId
    product
    demandForecast
    webScrap
    marginAnalysis
    personalizedPricing
    botResponses
    status
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetPricingQueryVariables,
  APITypes.GetPricingQuery
>;
export const listPricings = /* GraphQL */ `query ListPricings(
  $filter: ModelPricingFilterInput
  $limit: Int
  $nextToken: String
) {
  listPricings(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      userId
      product
      demandForecast
      webScrap
      marginAnalysis
    personalizedPricing
      botResponses
      status
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListPricingsQueryVariables,
  APITypes.ListPricingsQuery
>;
export const pricingByUserId = /* GraphQL */ `query PricingByUserId(
  $userId: ID!
  $sortDirection: ModelSortDirection
  $filter: ModelPricingFilterInput
  $limit: Int
  $nextToken: String
) {
  pricingByUserId(
    userId: $userId
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      userId
      product
      demandForecast
      webScrap
      marginAnalysis
    personalizedPricing
      botResponses
      status
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.PricingByUserIdQueryVariables,
  APITypes.PricingByUserIdQuery
>;
