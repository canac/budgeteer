import { Button, Container, Paper, PasswordInput, Stack, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { minLength, object, string } from "zod/mini";
import { login } from "~/functions/login";
import { isAuthenticated } from "~/lib/auth";

const checkLogin = createServerFn().handler(async () => {
  if (await isAuthenticated()) {
    throw redirect({
      to: "/",
    });
  }
});

const formSchema = object({
  password: string().check(minLength(1, "Password is required")),
});

export const Route = createFileRoute("/login")({
  beforeLoad: () => checkLogin(),
  component: LoginPage,
});

function LoginPage() {
  const form = useForm({
    mode: "controlled",
    validateInputOnChange: true,
    initialValues: {
      password: "",
    },
    validate: zod4Resolver(formSchema),
  });

  const handleSubmit = form.onSubmit(async (values, event) => {
    event?.preventDefault();

    const { success } = await login({
      data: {
        password: values.password,
      },
    });
    if (!success) {
      form.setFieldError("password", "Invalid password");
    }
  });

  return (
    <Container size="xs" style={{ paddingTop: "20vh" }}>
      <Paper shadow="md" p="xl" radius="md">
        <Stack gap="lg">
          <div>
            <Title order={2} ta="center">
              Welcome to Budgeteer
            </Title>
          </div>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <PasswordInput
                label="Password"
                key={form.key("password")}
                {...form.getInputProps("password")}
              />

              <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
                Login
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
}
