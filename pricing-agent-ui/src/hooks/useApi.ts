import { generateClient } from "aws-amplify/api";
import { createPricing, resolverLambda } from "../graphql/mutations";
import { QUERY_KEYS } from "../utilities/types";
import { useQuery } from "@tanstack/react-query";
import { getPricing, pricingByUserId } from "../graphql/queries";
import { Pricing } from "../API";
const client = generateClient();

export const addPricing = (userId: string, product: string) =>
    client.graphql({
        query: createPricing,
        variables: {
            input: {
                userId,
                product,
                status: "in-progress",
            },
        },
    });

export const fetchPricing = async (id: string) => {
    const response = await client.graphql({
        query: getPricing,
        variables: {
            id,
        },
    });

    return response.data.getPricing;
};

export const useGetPricing = (id: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.PRICING, id],
        queryFn: () => fetchPricing(id),
        enabled: !!id,
    });
};

const listPricingByUserQuery = async (userId: string) => {
    let nextToken: string | null | undefined = "";
    let data: Pricing[] = [];
    try {
        do {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const variables: any = {
                userId,
                ...(nextToken && { nextToken }),
            };
            const response = await client.graphql({
                query: pricingByUserId,
                variables,
            });
            nextToken = response.data.pricingByUserId.nextToken;
            // sort in descending order based on time
            const sorted = response.data.pricingByUserId.items.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            if (sorted) data = [...data, ...sorted];
        } while (nextToken != null);
        // return only first 50 items
        return data.slice(0, 50);
    } catch (err) {
        console.log(err);
        return [];
    }
};

export const useListPricingByUserID = (userID: string) =>
    useQuery({
        queryKey: [QUERY_KEYS.PRICING, userID],
        queryFn: () => listPricingByUserQuery(userID),
    });

/**
 * Resolver Lambda
 * @param args
 * @returns
 */

export const appsyncResolver = (args: string) =>
    client.graphql({
        query: resolverLambda,
        variables: {
            args,
        },
    });
