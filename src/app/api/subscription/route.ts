import { NextRequest, NextResponse } from 'next/server';
import { getUser, updateDocument } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { TIERS } from '@/lib/subscription-config';
import { ApiResponse } from '@/types/index';

type SubscriptionInfo = {
  tier: string;
  tier_name: string;
  features: (typeof TIERS)['free']['features'];
  limits: {
    docs_per_month: number;
    storage_mb: number;
    max_pages_per_doc: number;
  };
  platforms: string[];
};

type UpgradeRequest = {
  new_tier: 'free' | 'lifetime' | 'pro' | 'enterprise';
};

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SubscriptionInfo>>> {
  try {
    const userId = getUserFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get user
    const user = await getUser(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Get tier configuration
    const tierConfig = TIERS[user.tier];

    const subscriptionInfo: SubscriptionInfo = {
      tier: user.tier,
      tier_name: tierConfig.name,
      features: tierConfig.features,
      limits: {
        docs_per_month: tierConfig.docsPerMonth,
        storage_mb: tierConfig.storageMB,
        max_pages_per_doc: tierConfig.maxPagesPerDoc,
      },
      platforms: tierConfig.platforms,
    };

    return NextResponse.json(
      {
        success: true,
        data: subscriptionInfo,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<SubscriptionInfo>>> {
  try {
    const userId = getUserFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get user
    const user = await getUser(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    const body: UpgradeRequest = await request.json();
    const { new_tier } = body;

    if (!new_tier) {
      return NextResponse.json(
        {
          success: false,
          error: 'New tier is required',
        },
        { status: 400 }
      );
    }

    // Validate tier
    const validTiers = ['free', 'lifetime', 'pro', 'enterprise'];
    if (!validTiers.includes(new_tier)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tier',
        },
        { status: 400 }
      );
    }

    // Update user tier (simulated - in production this would involve payment processing)
    user.tier = new_tier;

    // Get updated tier configuration
    const tierConfig = TIERS[new_tier];

    const subscriptionInfo: SubscriptionInfo = {
      tier: new_tier,
      tier_name: tierConfig.name,
      features: tierConfig.features,
      limits: {
        docs_per_month: tierConfig.docsPerMonth,
        storage_mb: tierConfig.storageMB,
        max_pages_per_doc: tierConfig.maxPagesPerDoc,
      },
      platforms: tierConfig.platforms,
    };

    return NextResponse.json(
      {
        success: true,
        data: subscriptionInfo,
        message: `Subscription upgraded to ${tierConfig.name} tier`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
