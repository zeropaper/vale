export type Attestation = {
  repository_id: number;
  bundle_url: string;
  initiator: string;
  bundle: {
    mediaType: string;
    verificationMaterial: {
      timestampVerificationData: {
        rfc3161Timestamps: Array<{
          signedTimestamp: string;
        }>;
      };
      certificate: {
        rawBytes: string;
      };
    };
    dsseEnvelope: {
      payload: string;
      payloadType: string;
      signatures: Array<{
        sig: string;
      }>;
    };
  };
};
export type AttestationsResponse = {
  attestations: Attestation[];
};

/**
 * Data related to a release.
 */
export interface ReleaseAsset {
  url: string;
  browser_download_url: string;
  id: number;
  node_id: string;
  /**
   * The file name of the asset.
   */
  name: string;
  label: string | null;
  /**
   * State of the release asset.
   */
  state: "uploaded" | "open";
  content_type: string;
  size: number;
  digest: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
  uploader: null | SimpleUser;
  [k: string]: unknown;
}
/**
 * A GitHub user.
 */
export interface SimpleUser {
  name?: string | null;
  email?: string | null;
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string | null;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  starred_at?: string;
  user_view_type?: string;
}

export interface ReactionRollup {
  url: string;
  total_count: number;
  "+1": number;
  "-1": number;
  laugh: number;
  confused: number;
  heart: number;
  hooray: number;
  eyes: number;
  rocket: number;
}

/**
 * A release.
 */
export interface Release {
  url: string;
  html_url: string;
  assets_url: string;
  upload_url: string;
  tarball_url: string | null;
  zipball_url: string | null;
  id: number;
  node_id: string;
  /**
   * The name of the tag.
   */
  tag_name: string;
  /**
   * Specifies the commitish value that determines where the Git tag is created from.
   */
  target_commitish: string;
  name: string | null;
  body?: string | null;
  /**
   * true to create a draft (unpublished) release, false to create a published one.
   */
  draft: boolean;
  /**
   * Whether to identify the release as a prerelease or a full release.
   */
  prerelease: boolean;
  /**
   * Whether or not the release is immutable.
   */
  immutable?: boolean;
  created_at: string;
  published_at: string | null;
  updated_at?: string | null;
  author: SimpleUser;
  assets: ReleaseAsset[];
  body_html?: string;
  body_text?: string;
  mentions_count?: number;
  /**
   * The URL of the release discussion.
   */
  discussion_url?: string;
  reactions?: ReactionRollup;
}

export interface MetaFile {
  versions: Record<string, VersionEntry>;
}
export type UpstreamAsset =
  | "Linux_64-bit"
  | "Linux_arm64"
  | "macOS_64-bit"
  | "macOS_arm64"
  | "Windows_64-bit"
  | "Windows_arm64";

export type SupportedPlatforms =
  | "linux-x64"
  | "linux-arm64"
  | "darwin-x64"
  | "darwin-arm64"
  | "win32-x64"
  | "win32-arm64";

export type Binary = {
  /** URL to download the binary */
  url: string;
  /** sha256 checksum of the binary */
  checksum: string;
  /** size in bytes of the binary */
  size: number;
};
export const SkipReason = {
  UNVERIFIED: 0,
  INCOMPLETE: 1,
  ERROR: 2,
} as const;
export type SkipReason = (typeof SkipReason)[keyof typeof SkipReason];
export type VersionEntry = Failure | Success;
export type Failure = {
  skip: SkipReason;
  skip_count: number;
  bins?: never;
};
export type Success = {
  skip: false;
  skip_count?: never;
  bins: Record<UpstreamAsset, Binary>;
};
export type VerificationResult = {
  attestation: {
    bundle: {
      mediaType: string;
      verificationMaterial: {
        certificate: {
          rawBytes: string;
        };
        timestampVerificationData: {
          rfc3161Timestamps: Array<{
            signedTimestamp: string;
          }>;
        };
      };
      dsseEnvelope: {
        payload: string;
        payloadType: string;
        signatures: Array<{
          sig: string;
        }>;
      };
    };
    bundle_url: string;
    initiator: string;
  };
  verificationResult: {
    mediaType: string;
    signature: {
      certificate: {
        certificateIssuer: string;
        subjectAlternativeName: string;
      };
    };
    verifiedTimestamps: Array<{
      type: string;
      uri: string;
      timestamp: string;
    }>;
    verifiedIdentity: {
      subjectAlternativeName: {
        subjectAlternativeName: string;
        regexp: string;
      };
      issuer: {
        issuer: string;
        regexp: string;
      };
    };
    statement: {
      _type: string;
      subject: Array<NamedSubject | UriSubject>;
      predicateType: string;
      predicate: {
        databaseId: string;
        ownerId: string;
        packageId: string;
        purl: string;
        repository: string;
        repositoryId: string;
        tag: string;
      };
    };
  };
};
export type NamedSubject = {
  digest: {
    sha256: string;
  };
  name: string;
};

export type UriSubject = {
  uri: string;
  digest: {
    sha?: string;
  };
};
