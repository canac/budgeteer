import { Container, type ContainerProps } from "@mantine/core";

/**
 * Page wrapper with consistent padding across all pages
 */
export function PageContainer(props: ContainerProps) {
  return <Container size="lg" px={{ base: 0, sm: "md" }} py={{ base: 0, sm: "lg" }} {...props} />;
}
