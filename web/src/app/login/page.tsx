"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button, Card, Form, Input, Typography } from "antd";

import { login } from "@/services/api/auth";
import { useUserStore } from "@/stores/use-user-store";

type FormValues = {
    email: string;
    password: string;
};

export default function LoginPage() {
    const { message } = App.useApp();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [form] = Form.useForm<FormValues>();
    const setUser = useUserStore((state) => state.setUser);
    const [submitting, setSubmitting] = useState(false);

    const next = searchParams.get("next") || "/canvas";

    const submit = async () => {
        const values = await form.validateFields();
        setSubmitting(true);
        try {
            const result = await login({ email: values.email, password: values.password });
            setUser(result.user);
            message.success("登录成功");
            router.replace(next);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "登录失败");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fef3c7,transparent_35%),radial-gradient(circle_at_bottom_right,#dbeafe,transparent_35%),#f8fafc] px-6 py-10">
            <Card className="w-full max-w-md rounded-3xl border-0 shadow-2xl" styles={{ body: { padding: 28 } }}>
                <Typography.Title level={2} className="!mb-2 !text-center">
                    无限画布
                </Typography.Title>
                <Typography.Paragraph className="mb-6 text-center text-stone-500">请使用 `sub2api` 里已有的邮箱账号登录。登录后才能进入我的画布、生图工作台和我的素材，数据会按账号保存到 PostgreSQL。</Typography.Paragraph>

                <Form form={form} layout="vertical" onFinish={() => void submit()}>
                    <Form.Item label="邮箱" name="email" rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "请输入正确的邮箱地址" }]}>
                        <Input placeholder="sub2api 注册邮箱" autoComplete="username" />
                    </Form.Item>
                    <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
                        <Input.Password placeholder="请输入 sub2api 登录密码" autoComplete="current-password" />
                    </Form.Item>
                    <Button block type="primary" size="large" htmlType="submit" loading={submitting}>
                        登录并进入
                    </Button>
                </Form>
            </Card>
        </main>
    );
}
