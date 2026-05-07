/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreatePricing = /* GraphQL */ `subscription OnCreatePricing(
  $filter: ModelSubscriptionPricingFilterInput
  $userId: String
) {
  onCreatePricing(filter: $filter, userId: $userId) {
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
` as GeneratedSubscription<
  APITypes.OnCreatePricingSubscriptionVariables,
  APITypes.OnCreatePricingSubscription
>;
export const onUpdatePricing = /* GraphQL */ `subscription OnUpdatePricing(
  $filter: ModelSubscriptionPricingFilterInput
  $userId: String
) {
  onUpdatePricing(filter: $filter, userId: $userId) {
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
` as GeneratedSubscription<
  APITypes.OnUpdatePricingSubscriptionVariables,
  APITypes.OnUpdatePricingSubscription
>;
export const onDeletePricing = /* GraphQL */ `subscription OnDeletePricing(
  $filter: ModelSubscriptionPricingFilterInput
  $userId: String
) {
  onDeletePricing(filter: $filter, userId: $userId) {
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
` as GeneratedSubscription<
  APITypes.OnDeletePricingSubscriptionVariables,
  APITypes.OnDeletePricingSubscription
>;
export const onPricingById = /* GraphQL */ `subscription OnPricingById($id: ID!) {
  onPricingById(id: $id) {
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
` as GeneratedSubscription<
  APITypes.OnPricingByIdSubscriptionVariables,
  APITypes.OnPricingByIdSubscription
>;
