declare type HTTPResponse = {
    status: number;
    headers: {
        [key: string]: string;
    };
    body: string;
};
export declare function getReq(_url: string, _headers: any): Promise<HTTPResponse>;
export declare function postReq(_url: any, _headers: any, body: any): Promise<HTTPResponse>;
export {};
