import { useEffect, useState } from "react";
import { createProvider, updateProvider } from "../../services/provider";
import { IProvider } from "../../types";
import { newProvider } from "../../services/provider";
import CustomModal from "../../components/common/CustomModal";
import Swal from "sweetalert2";

interface ProviderModalProps {
  isOpen: boolean;
  data?: IProvider;
  onCloseModal: () => void;
  onSuccess: () => void;
}

const ModalProvider: React.FC<ProviderModalProps> = ({
  isOpen,
  data,
  onCloseModal,
  onSuccess,
}) => {
  const [provider, setProvider] = useState<IProvider>(newProvider);
  const [initialData, setInitialData] = useState<IProvider | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (data) {
      setProvider(data);
      setInitialData(data);
    } else {
      setProvider(newProvider);
      setInitialData(null);
    }
  }, [data]);

  const setValue = (name: keyof IProvider, value: string | number) => {
    setProvider((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts editing
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!provider.name) {
      newErrors.name = "Tên nhà cung cấp không được để trống.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendRequest = async () => {
    if (!validateForm()) return;

    // Check if data hasn't changed
    if (
      provider.id &&
      JSON.stringify(provider) === JSON.stringify(initialData)
    ) {
      onCloseModal();
      return;
    }

    if (!provider.id) {
      const res = await createProvider(provider);
      if (res?.status === 200) {
        Swal.fire({
          title: "Thêm thành công!",
          text: `Thêm thành công nhà cung cấp ${res.data.name} !`,
          icon: "success",
        });
        onCloseModal();
        onSuccess();
      }
    } else {
      try {
        const res = await updateProvider(provider.id, provider);
        if (res?.status === 200) {
          Swal.fire({
            title: "Cập nhật thành công!",
            text: `Cập nhật thành công nhà cung cấp ${res.data.name} !`,
            icon: "success",
          });
          onCloseModal();
          onSuccess();
        }
      } catch (err: any) {
        console.log(">>", err);
      }
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      title={data ? "Cập nhật nhà cung cấp" : "Tạo nhà cung cấp mới"}
      description="Cập nhật thông tin chi tiết để thông tin của bạn luôn được cập nhật."
      fields={[
        {
          name: "name",
          label: "Tên nhà cung cấp",
          type: "text",
          value: provider.name || "",
          onChange: (value) => setValue("name", value as string),
          placeholder: "Nhập tên nhà cung cấp",
          error: errors.name,
        },
        {
          name: "description",
          label: "Mô tả",
          type: "textarea",
          value: provider.description || "",
          onChange: (value) => setValue("description", value as string),
          placeholder: "Nhập chi tiết",
          error: errors.description,
        },
      ]}
      onClose={onCloseModal}
      onSubmit={sendRequest}
      submitText={provider.id ? "Lưu thay đổi" : "Thêm"}
    />
  );
};

export default ModalProvider;
