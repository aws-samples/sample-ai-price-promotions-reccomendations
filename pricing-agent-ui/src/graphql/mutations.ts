/* tslint:disable */
/* eslint-disable */
// nosemgrep: missing-template-string-indicator
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createPricing = /* GraphQL */ `mutation CreatePricing(
  $input: CreatePricingInput!
  $condition: ModelPricingConditionInput
) {
  createPricing(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreatePricingMutationVariables,
  APITypes.CreatePricingMutation
>;
export const updatePricing = /* GraphQL */ `mutation UpdatePricing(
  $input: UpdatePricingInput!
  $condition: ModelPricingConditionInput
) {
  updatePricing(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdatePricingMutationVariables,
  APITypes.UpdatePricingMutation
>;
export const deletePricing = /* GraphQL */ `mutation DeletePricing(
  $input: DeletePricingInput!
  $condition: ModelPricingConditionInput
) {
  deletePricing(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeletePricingMutationVariables,
  APITypes.DeletePricingMutation
>;
// nosemgrep: missing-template-string-indicator
export const resolverLambda = /* GraphQL */ `mutation ResolverLambda($args: String) {
  resolverLambda(args: $args)
}
` as GeneratedMutation<
  APITypes.ResolverLambdaMutationVariables,
  APITypes.ResolverLambdaMutation
>;
