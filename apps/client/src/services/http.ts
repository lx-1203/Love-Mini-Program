import { appEnv } from "./env";
import { AppApiError, toAppApiError } from "./api-error";

export interface RequestOptions<TBody = unknown> {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: TBody;
}

export async function request<TResponse, TBody = unknown>(
  options: RequestOptions<TBody>
): Promise<TResponse> {
  return new Promise<TResponse>((resolve, reject) => {
    uni.request({
      url: `${appEnv.apiBaseUrl}${options.url}`,
      method: options.method || "GET",
      data: options.data as Record<string, unknown> | string | ArrayBuffer | undefined,
      success: (result) => {
        const statusCode = result.statusCode ?? 0;

        if (statusCode >= 200 && statusCode < 300) {
          resolve(result.data as TResponse);
          return;
        }

        reject(toAppApiError(statusCode, result.data));
      },
      fail: (error) => {
        if (error instanceof Error) {
          reject(error);
          return;
        }

        reject(
          new AppApiError({
            status: 0,
            error: "network_error",
            message: "网络请求失败",
            details: error,
          })
        );
      },
    });
  });
}
