"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScannerService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
const dotenv = require("dotenv");
dotenv.config();
let ScannerService = class ScannerService {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async tokenAnalyzer(contract) {
        try {
            const tokenMetaUrl = `https://pro-api.solscan.io/v2.0/token/meta?address=${contract}`;
            const holdersUrl = `https://pro-api.solscan.io/v2.0/token/holders?address=${contract}&page=1&page_size=20`;
            const respMetadata = await fetch(tokenMetaUrl, {
                method: 'GET',
                headers: { token: process.env.SOLSCAN_TOKEN },
            });
            if (!respMetadata.ok) {
                return { error: 'Invalid contract format or metadata not found' };
            }
            const metadata = await respMetadata.json();
            if (!metadata.data.name ||
                !metadata.data.symbol ||
                !metadata.data.supply ||
                !metadata.data.decimals) {
                return { error: 'Invalid contract: Not a valid Solana SPL token' };
            }
            const respHolders = await fetch(holdersUrl, {
                method: 'GET',
                headers: { token: process.env.SOLSCAN_TOKEN },
            });
            if (!respHolders.ok) {
                throw new Error('Failed to fetch price data');
            }
            const Holders = await respHolders.json();
            const calculateOwnership = (holders, totalSupply) => {
                return holders.map((holder) => {
                    const percentage = (holder.amount / totalSupply) * 100;
                    return {
                        ...holder,
                        percentage: percentage.toFixed(2),
                    };
                });
            };
            const isContractBundled = (tokenDistribution, tolerance = 0.01, minConsecutive = 7) => {
                const sortedDistribution = tokenDistribution.sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage));
                let consecutiveCount = 1;
                for (let i = 1; i < sortedDistribution.length; i++) {
                    const prevPercentage = parseFloat(sortedDistribution[i - 1].percentage);
                    const currentPercentage = parseFloat(sortedDistribution[i].percentage);
                    if (Math.abs(currentPercentage - prevPercentage) <= tolerance) {
                        consecutiveCount++;
                        if (consecutiveCount >= minConsecutive) {
                            return true;
                        }
                    }
                    else {
                        consecutiveCount = 1;
                    }
                }
                return false;
            };
            const tokenAnalyticData = {
                tokenName: metadata.data.name,
                tokenSymbol: metadata.data.symbol,
                totalSupply: metadata.data.supply,
                decimals: metadata.data.decimals,
                tokenHoldersCount: metadata.data.holder,
                creatorAddress: metadata.data.creator,
                mintSignature: metadata.data.create_tx,
                createdTime: metadata.data.created_time,
                price: metadata.data.price,
                marketCap: metadata.data.market_cap,
                marketCapRank: metadata.data.market_cap_rank,
            };
            const AgentRole = `You are an AI agent specializing in Solana blockchain analysis. Your task is to analyze an SPL token based on the provided on-chain data and generate detailed insights, key findings, and future projections. Please present the response in a structured format.

Here is the SPL token data:
- Token Name: ${tokenAnalyticData.tokenName}
- Symbol: ${tokenAnalyticData.tokenSymbol}
- Total Supply: ${tokenAnalyticData.totalSupply}
- Decimal: ${tokenAnalyticData.decimals}
- price : $${tokenAnalyticData.price}
- marketCap : ${tokenAnalyticData.marketCap}
- numbers of holders : ${tokenAnalyticData.tokenHoldersCount}

Please provide the following:
{
- summary:Key observations about the token and summary,
- tokenInfo:info about the token, like name, symbol, decimal, total supply, ismutable,
- Warnings: Predict future trends in growth, market interest, and volatility. Provide warnings if necessary or indicate no warnings,
- actionableAdvice: Recommendations for token holders or potential investors,
- ValueAndMarketCapitalization:Provide the price of the token in dollars and the Market capitalization.
}

Use a concise, professional tone and present your findings in an organized manner. and always let it be a stringified object is the format {...} and never json{...}`;
            const response = await this.openai.chat.completions.create({
                messages: [
                    { role: 'assistant', content: AgentRole },
                    { role: 'user', content: 'Analyze this token' },
                ],
                model: 'gpt-4o-mini',
            });
            const response2 = await this.openai.chat.completions.create({
                messages: [
                    { role: 'assistant', content: AgentRole },
                    {
                        role: 'user',
                        content: 'just answer true or false, is this token a honeypot token based on your analysis of the giving data, you answer must be true or false nothing else',
                    },
                ],
                model: 'gpt-4o-mini',
            });
            const AIresponse = response.choices[0].message?.content.trim();
            const AIresponse2 = response2.choices[0].message?.content.trim();
            const tokenDestribution = calculateOwnership(Holders.data.items, +tokenAnalyticData.totalSupply);
            return {
                AIresponse: JSON.parse(AIresponse),
                tokenDetails: { ...tokenAnalyticData, isHoneyPot: AIresponse2 },
                tokenDestribution,
                isContractBundled: isContractBundled(tokenDestribution),
            };
        }
        catch (error) {
            console.error('Error generating reply:', error);
            return { error: 'There was an error processing the request...' };
        }
    }
};
exports.ScannerService = ScannerService;
exports.ScannerService = ScannerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ScannerService);
//# sourceMappingURL=scanner.service.js.map