
import guest from './lib/guest';
import customer from './lib/customer';
import { GUEST_TYPE, CUSTOMER_TYPE } from './types';
import { BASE_URL } from '../helper/Constants';

class ApiError extends Error {
  constructor(m: string) {
    super(m);
  }
}

export class AppOperation {
  base_url;
  root_path;
  guest;
  customer;
  customerToken: string | null | undefined;
  customerRefreshToken: string | null | undefined;
  refreshInFlight: Promise<string | null> | null = null;

  constructor() {
    this.base_url = BASE_URL;
    this.root_path = `v1/`;
    this.guest = guest(this);
    this.customer = customer(this);
  }

  setCustomerRefreshToken(token: string | null | undefined) {
    this.customerRefreshToken = token;
  }

  async tryRefreshAccessToken(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;
    const refresh = this.customerRefreshToken;
    if (!refresh) return null;

    this.refreshInFlight = (async () => {
      try {
        const baseUrl = this.base_url.endsWith('/') ? this.base_url.slice(0, -1) : this.base_url;
        const rootPath = this.root_path.startsWith('/') ? this.root_path : `/${this.root_path}`;
        const cleanRootPath = rootPath.endsWith('/') ? rootPath : `${rootPath}/`;
        const url = `${baseUrl}${cleanRootPath}security/auth/refresh`;

        console.log("🔄 [REFRESH TOKEN] API FETCHING ===", url);
        console.log("🕒 [OLD TOKEN]:", String(this.customerToken).substring(0, 20) + "...");

        const { Platform } = require('react-native');
        const DeviceInfo = require('react-native-device-info');
        const deviceId = DeviceInfo.getUniqueIdSync();

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': deviceId,
            'X-Platform': Platform.OS,
          },
          body: JSON.stringify({ refresh_token: refresh }),
        });

        const body = await res.json();
        console.log("📥 [REFRESH TOKEN RESPONSE]:", body);
        
        if (!body.success) return null;

        const d = body.data && typeof body.data === 'object' ? body.data : body;
        const access = d.access_token || d.token;
        const nextRefresh = d.refresh_token || refresh;

        if (access) {
          console.log("✅ [REFRESH TOKEN SUCCESS] New Token:", access.substring(0, 20) + "...");
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const { USER_TOKEN_KEY, USER_REFRESH_TOKEN_KEY } = require('../helper/Constants');
          this.setCustomerToken(access);
          this.setCustomerRefreshToken(nextRefresh);
          await AsyncStorage.setItem(USER_TOKEN_KEY, access);
          await AsyncStorage.setItem(USER_REFRESH_TOKEN_KEY, nextRefresh);
          const { socketService } = require('../services/socket/SocketService');
          socketService.reconnectWithToken(access);
          return access;
        }
        return null;
      } catch (e) {
        return null;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  config(config: any) {
    if (config.url) {
      this.base_url = config.url;
    }
  }

  post(path: string, params: any, type: string = GUEST_TYPE, extraHeaders?: Record<string, string>) {
    return this.send(path, 'POST', null, params, type, extraHeaders);
  }

  patch(path: string, params: any, type: string = GUEST_TYPE) {
    return this.send(path, 'PATCH', null, params, type);
  }

  put(path: string, params: any, type: string = GUEST_TYPE) {
    return this.send(path, 'PUT', null, params, type);
  }

  get(path: string, params?: any, data?: any, type: string = GUEST_TYPE) {
    return this.send(path, 'GET', params, data, type);
  }

  delete(path: string, params: any, type: string = GUEST_TYPE) {
    return this.send(path, 'DELETE', params, null, type);
  }

  send(url: string, method: string, params: any, data: any, type: string, extraHeaders?: Record<string, string>) {
    let uri: any;

    // Ensure no double slashes between base_url and root_path or url
    const baseUrl = this.base_url.endsWith('/') ? this.base_url.slice(0, -1) : this.base_url;

    if (url.startsWith('api/') || url.startsWith('spot/')) {
      uri = `${baseUrl}/${url}`;
    } else {
      const rootPath = this.root_path.startsWith('/') ? this.root_path : `/${this.root_path}`;
      const cleanRootPath = rootPath.endsWith('/') ? rootPath : `${rootPath}/`;
      const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
      uri = `${baseUrl}${cleanRootPath}${cleanUrl}`;
    }

    if (params) {
      let separator = '?';
      Object.keys(params).forEach(key => {
        uri += `${separator}${key}=${params[key]}`;
        separator = '&';
      });
    }

    // check if there's any missing parameters
    const missingFields = uri.match(/(\{[a-zA-Z0-9_]+\})/g);
    if (missingFields && missingFields.length > 0) {
      return Promise.reject(
        `URL missing parameters: ${missingFields.join(', ')}`,
      );
    }

    const headers: any = {};
    if (!(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.customerToken && type === CUSTOMER_TYPE) {
      const token = String(this.customerToken).trim();
      const prefix = token.startsWith('Bearer ') ? '' : 'Bearer ';
      headers['Authorization'] = `${prefix}${token}`;
    }

    try {
      const { Platform } = require('react-native');
      const DeviceInfo = require('react-native-device-info');
      headers['X-Device-Id'] = DeviceInfo.getUniqueIdSync();
      headers['X-Platform'] = Platform.OS;
      headers['X-App-Version'] = DeviceInfo.getVersion();
    } catch (e) {
      console.warn('Could not set device headers', e);
    }

    if (extraHeaders && typeof extraHeaders === 'object') {
      Object.assign(headers, extraHeaders);
    }

    return new Promise((resolve, reject) => {
      let bodyData: any = undefined;
      if (data instanceof FormData) {
        bodyData = data;
        // Do not set Content-Type for FormData - fetch will set multipart/form-data with boundary
      } else if (data != null) {
        bodyData = JSON.stringify(data);
      }
      if (url.includes('submit-kyc')) {
        console.log('[KYC API] URL:', uri);
      }

      // AbortController for timeout — some Android phones hang indefinitely on poor networks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 second timeout

      const fetchInit: RequestInit = { method, headers, signal: controller.signal };
      if (bodyData !== undefined) {
        fetchInit.body = bodyData;
      }


      fetch(uri, fetchInit)
        .then(response => {
          clearTimeout(timeoutId);
          let status = response.status;
          if (response.ok) {
            return response
              .text()
              .then(responseData => {
                try {
                  const trimmed = String(responseData ?? '').trim();
                  if (!trimmed) {
                    resolve({ success: true, code: status });
                    return;
                  }
                  const jsonData: any = JSON.parse(trimmed);
                  resolve({ ...jsonData, code: status });
                } catch {
                  // Some proxies/backends return HTML even on 200; surface a readable error.
                  const preview = String(responseData || '').trim().slice(0, 500); // Increased slice to see more
                  console.warn('[DEBUG] SERVER RAW HTML:', responseData);
                  reject(
                    new ApiError(
                      preview.startsWith('<')
                        ? 'Server returned HTML instead of JSON. Please try again later.'
                        : 'Server returned an invalid response format.'
                    )
                  );
                }
              })
              .catch(errorResponse =>
                Promise.reject({ code: status, data: errorResponse }),
              );
          }
          // Possible 401 or other network error
          return response
            .text()
            .then(errorResponse => {
              let parsed: any = {};
              try {
                parsed = JSON.parse(errorResponse || '{}');
              } catch {
                const rawError = String(errorResponse || '').trim();
                console.warn('[DEBUG] SERVER RAW HTML:', rawError);
                // FORCE IT TO SHOW ON SCREEN SO THEY CAN SEE IT!
                // Alert.alert("BACKEND HTML ERROR", rawError.slice(0, 1000));

                parsed = {
                  message: rawError.startsWith('<')
                    ? 'Server returned HTML error page.'
                    : rawError || 'Unexpected server error.',
                };
              }
              const errData = { code: status, ...parsed };
              if (uri.includes("user/login")) {
                console.log("[Login][HTTP] user/login error", {
                  httpStatus: status,
                  url: uri,
                  parsed,
                  errData,
                });
              }
              // Suppress known fallback 404 warnings to keep console clean
              const isFallbackEndpoint = uri.includes('withdrawal-coins') || uri.includes('deposit-coins') || uri.includes('credential_options') || uri.includes('passkey-withdrawal-challenge');
              if (!(status === 404 && isFallbackEndpoint)) {
                // console.warn('[API] Error response:', status, JSON.stringify(errData));
              }

              const isTokenExpired = status === 401 || errData.code === 'TOKEN_EXPIRED' || errData.message === 'Token is expired' || errData.message === 'Token is Expired';

              if (isTokenExpired && !uri.includes('auth/refresh') && this.customerRefreshToken) {
                return this.tryRefreshAccessToken().then(newToken => {
                  if (newToken) {
                    // Retry the request with the new token
                    return this.send(url, method, params, data, type, extraHeaders).then(resolve).catch(reject);
                  } else {
                    reject(errData);
                  }
                });
              }

              reject(errData);
            });
        })
        .catch(error => {
          clearTimeout(timeoutId);
          // AbortError means timeout
          if (error?.name === 'AbortError') {
            console.warn('[API] Request timed out:', uri);
            reject(new ApiError('Request timed out. Please check your connection.'));
            return;
          }
          console.warn('[API] Network error:', uri, error?.message);
          const customError = this.getErrorMessageForResponse(error);
          reject(new ApiError(customError ?? 'Network request failed. Please try again.'));
        });
    });
  }

  getErrorMessageForResponse(data: any) {
    let message: string | undefined;
    try {
      if (data?.message) {
        message = data.message;
      } else if (data?.error && typeof data.error === 'string') {
        message = data.error;
      } else if (data?.data) {
        const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        message = parsed?.message || (typeof parsed?.error === 'string' ? parsed.error : undefined);
      }
    } catch (e) {
      console.error("Get error message for response:", e);
    }

    switch (data?.code) {
      // 100  Informational

      case 100: {
        message = message ? message : 'Continue';
        break;
      }

      case 101: {
        message = message ? message : 'Switching Protocols';
        break;
      }

      case 102: {
        message = message ? message : 'Processing';
        break;
      }

      //Success

      case 201: {
        message = message ? message : 'Created';
        break;
      }
      case 202: {
        message = message ? message : 'Accepted';
        break;
      }
      case 203: {
        message = message ? message : 'Non-authoritative Information';
        break;
      }
      case 204: {
        message = message ? message : 'No Content';
        break;
      }
      case 205: {
        message = message ? message : 'Reset Content';
        break;
      }
      case 206: {
        message = message ? message : 'Partial Content';
        break;
      }
      case 207: {
        message = message ? message : 'Multi-Status';
        break;
      }
      case 208: {
        message = message ? message : 'Already Reported';
        break;
      }
      case 226: {
        message = message ? message : 'IM Used';
        break;
      }

      // 300 Redirection

      case 300: {
        message = message ? message : 'Multiple Choices';
        break;
      }
      case 301: {
        message = message ? message : 'Moved Permanently';
        break;
      }
      case 302: {
        message = message ? message : 'Found';
        break;
      }
      case 303: {
        message = message ? message : 'See Other';
        break;
      }
      case 304: {
        message = message ? message : 'Not Modified';
        break;
      }
      case 305: {
        message = message ? message : 'Use Proxy';
        break;
      }
      case 307: {
        message = message ? message : 'Temporary Redirect';
        break;
      }
      case 308: {
        message = message ? message : 'Permanent Redirect';
        break;
      }

      // 400 Client Error

      case 400: {
        message = message ? message : 'Bad Request';
        break;
      }
      case 401: {
        message = message ? message : 'Unauthorized';
        break;
      }
      case 402: {
        message = message ? message : 'Payment Required';
        break;
      }
      case 403: {
        message = message ? message : 'Forbidden';
        break;
      }
      case 404: {
        message = message ? message : 'Not Found';
        break;
      }
      case 405: {
        message = message ? message : 'Method Not Allowed';
        break;
      }
      case 406: {
        message = message ? message : 'Not Acceptable';
        break;
      }
      case 407: {
        message = message ? message : 'Proxy Authentication Required';
        break;
      }
      case 408: {
        message = message ? message : 'Request Timeout';
        break;
      }
      case 409: {
        message = message ? message : 'Conflict';
        break;
      }
      case 410: {
        message = message ? message : 'Gone';
        break;
      }
      case 411: {
        message = message ? message : 'Length Required';
        break;
      }
      case 412: {
        message = message ? message : 'Precondition Failed';
        break;
      }
      case 413: {
        message = message ? message : 'Payload Too Large';
        break;
      }
      case 414: {
        message = message ? message : 'Request-URI Too Long';
        break;
      }
      case 415: {
        message = message ? message : 'Unsupported Media Type';
        break;
      }
      case 416: {
        message = message ? message : 'Requested Range Not Satisfiable';
        break;
      }
      case 417: {
        message = message ? message : 'Expectation Failed';
        break;
      }
      case 418: {
        message = message ? message : "I'm a teapot";
        break;
      }
      case 421: {
        message = message ? message : 'Misdirected Request';
        break;
      }
      case 422: {
        message = message ? message : 'Unprocessable Entity';
        break;
      }
      case 423: {
        message = message ? message : 'Locked';
        break;
      }
      case 424: {
        message = message ? message : ' Failed Dependency';
        break;
      }
      case 426: {
        message = message ? message : 'Upgrade Required';
        break;
      }
      case 428: {
        message = message ? message : 'Precondition Required';
        break;
      }
      case 429: {
        message = message ? message : 'Too Many Requests';
        break;
      }
      case 431: {
        message = message ? message : 'Request Header Fields Too Large';
        break;
      }
      case 444: {
        message = message ? message : 'Connection Closed Without Response';
        break;
      }
      case 451: {
        message = message ? message : 'Unavailable For Legal Reasons';
        break;
      }
      case 499: {
        message = message ? message : 'Client Closed Request';
        break;
      }

      // 500 Server Error

      case 500: {
        message = message ? message : 'Internal Server Error';
        break;
      }
      case 501: {
        message = message ? message : 'Not Implemented';
        break;
      }
      case 502: {
        message = message ? message : 'Internal Server Error';
        break;
      }
      case 503: {
        message = message ? message : 'Service Unavailable';
        break;
      }
      case 504: {
        message = message ? message : 'Gateway Timeout';
        break;
      }
      case 505: {
        message = message ? message : 'HTTP Version Not Supported';
        break;
      }
      case 506: {
        message = message ? message : 'Variant Also Negotiates';
        break;
      }
      case 507: {
        message = message ? message : 'Insufficient Storage';
        break;
      }
      case 508: {
        message = message ? message : 'Loop Detected';
        break;
      }
      case 510: {
        message = message ? message : 'Not Extended';
        break;
      }
      case 511: {
        message = message ? message : 'Network Authentication Required';
        break;
      }
      case 599: {
        message = message ? message : 'Network Connect Timeout Error';
        break;
      }
    }

    return message;
  }

  setCustomerToken(token: string) {
    this.customerToken = token;
  }
}

export const appOperation = new AppOperation();