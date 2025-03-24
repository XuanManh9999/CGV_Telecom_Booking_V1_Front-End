import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import ComponentCard from "../components/common/ComponentCard";
import PhoneTable from "../components/tables/ProviderTable/ProviderTable";

export default function Phone() {
  return (
    <>
      <PageMeta
        title="React.js Basic Tables Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Basic Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />

      <PageBreadcrumb pageTitle="Basic Tables" />

      <div className="space-y-6">
        <ComponentCard title="Basic Table 1">
          <PhoneTable />
        </ComponentCard>
      </div>
    </>
  );
}
