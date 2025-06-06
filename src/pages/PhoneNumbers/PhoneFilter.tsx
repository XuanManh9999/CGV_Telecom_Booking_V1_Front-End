import { useCallback, useState, useRef, useEffect } from "react";
import { IoIosAdd } from "react-icons/io";
import { useSearchParams } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";
import PhoneNumberModal from "./PhoneModalAdd";
import { IPhoneNumber, IProvider, ITypeNumber } from "../../types";
import { getProviders } from "../../services/provider";
import useSelectData from "../../hooks/useSelectData";
import ReusableTable from "../../components/common/ReusableTable";
import { FiEye } from "react-icons/fi";
import { formatDate } from "../../helper/formatDateToISOString";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { copyToClipBoard } from "../../helper/copyToClipboard";

import SearchHelp from "../../components/instruct/InstructRule";
import {
  booking,
  bookingPhone,
  deletePhone,
  getPhoneByID,
} from "../../services/phoneNumber";
import Pagination from "../../components/pagination/pagination";
import PhoneModalDetail from "./PhoneModalDetail";
import { FaRandom } from "react-icons/fa";

import Swal from "sweetalert2";
import Spinner from "../../components/common/LoadingSpinner";
import PhoneRandomModal from "./PhoneRandomModal";
import { getTypeNumber } from "../../services/typeNumber";

interface PhoneNumberProps {
  total_pages: number;
  phone_numbers: IPhoneNumber[];
}

const columns: {
  key: keyof IPhoneNumber;
  label: string;
  type?: string;
  classname?: string;
}[] = [
  { key: "phone_number", label: "Số điện thoại" },
  { key: "provider_name" as "provider_id", label: "Nhà cung cấp" },
  { key: "type_name" as "type_number_id", label: "Loại số" },
  { key: "installation_fee", label: "Phí lắp đặt (đ)" },
  { key: "maintenance_fee", label: "Phí duy trì (đ)" },
  { key: "vanity_number_fee", label: "Phí số đẹp (đ)" },
  {
    key: "status",
    label: "Trạng thái",
    type: "span",
    classname:
      "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium text-theme-xs bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  },
];

function PhoneNumberFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openModal, setOpenModal] = useState(false);
  const [openModalDetail, setOpenModalDetail] = useState(false);
  const [openModalRandom, setOpenModalRandom] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [search, setSearch] = useState<string>(
    searchParams.get("search") || ""
  );
  const [data, setData] = useState<PhoneNumberProps | undefined>(undefined);
  const [provider, setProvider] = useState<string | null>(
    searchParams.get("provider") || null
  );
  const [typeNumber, setTypeNumber] = useState<string | null>(
    searchParams.get("typeNumber") || null
  );

  const [quantity, setQuantity] = useState(
    Number(searchParams.get("quantity")) || 20
  );
  const [offset, setOffset] = useState(Number(searchParams.get("offset")) || 0);
  const [previousSearch, setPreviousSearch] = useState<string>("");
  const controllerRef = useRef<AbortController | null>(null);
  const [selectedPhone, setselectedPhone] = useState<IPhoneNumber | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);
  const [error, setError] = useState("");
  const user = useSelector((state: RootState) => state.auth.user);

  // Set default value of quantity và offset if do not have
  useEffect(() => {
    if (!searchParams.get("quantity") || !searchParams.get("offset")) {
      setSearchParams((prev: any) => {
        const newParams = new URLSearchParams(prev);
        if (!newParams.get("quantity")) newParams.set("quantity", "20");
        if (!newParams.get("offset")) newParams.set("offset", "0");

        return newParams;
      });
    }
  }, [searchParams, setSearchParams]);

  // Cleanup AbortController when component unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  // Get list providers
  const { data: providers } = useSelectData<IProvider>({
    service: getProviders,
  });
  const { data: typeNumbers } = useSelectData<ITypeNumber>({
    service: getTypeNumber,
  });
  // Call api when change properties
  const fetchData = useCallback(async () => {
    // Cancel old request
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    let isMounted = true;
    setLoading(true);
    try {
      const response = await bookingPhone({
        offset: offset,
        quantity,
        telco: provider || "",
        type_number: typeNumber || "",
        search: search.replace(/\s+/g, " ").trim() || "",
        signal: controller.signal,
      });
      const formatNumber = (num: any) => {
        return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") || "0";
      };
      const formattedData = response.data.phone_numbers.map(
        (phone: IPhoneNumber) => ({
          ...phone,
          booked_until: phone.booked_until
            ? formatDate(phone.booked_until)
            : "0",
          installation_fee: formatNumber(phone?.installation_fee),
          maintenance_fee: formatNumber(phone?.maintenance_fee),
          vanity_number_fee: formatNumber(phone?.vanity_number_fee),
        })
      );
      if (isMounted) {
        if (response.data.phone_numbers.length === 0) {
          setError("Không có dữ liệu");
        } else if (formattedData.length === 0) {
          setError(
            "Dữ liệu số bạn chọn đã hết! Vui lòng chọn định dạng hoặc nhà cung cấp khác"
          );
        } else {
          setError("");
        }
        setData({
          ...response.data,
          phone_numbers: formattedData,
        });
        setSelectedIds([]);
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.set("quantity", quantity.toString());
          newParams.set("offset", offset.toString());
          if (provider) newParams.set("provider", provider);
          else newParams.delete("provider");
          if (search) newParams.set("search", search);
          else newParams.delete("search");
          if (typeNumber) newParams.set("typeNumber", typeNumber);
          else newParams.delete("typeNumber");
          return newParams;
        });
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error when get data:", error);
      }
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }

    return () => {
      isMounted = false;
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [search, provider, typeNumber, quantity, offset, setSearchParams]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search !== previousSearch) {
      fetchData();
      setPreviousSearch(search.replace(/\s+/g, " ").trim());
    }
  };

  // Call API when change offset, quantity, provider
  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, quantity, provider, typeNumber]);

  const handleGetById = async (id: number) => {
    try {
      const res = await getPhoneByID(id);
      if (res?.data) {
        const { type_number_id, ...rest } = res.data;
        const modifiedData = {
          ...rest,
          type_id: type_number_id, // change key name
        };
        setselectedPhone(modifiedData);
        setOpenModalDetail(true);
      }
    } catch (error) {
      console.error("Failed to fetch phone data:", error);
      Swal.fire("Lỗi", "Không thể tải dữ liệu chi tiết", "error");
    }
  };

  const safeData = data?.phone_numbers ?? [];

  // Handle Book Number
  const getIds = (data: any) => {
    setSelectedIds(data);
  };
  const handleBookNumber = async () => {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 số điện thoại !");
      return;
    }
    const selectedPhoneNumbers = data?.phone_numbers.filter((phone) =>
      selectedIds.includes(phone.id)
    );

    const requestBody = {
      id_phone_numbers: selectedIds,
      phone_details: selectedPhoneNumbers?.map((p) => p.phone_number) || [],
    };
    setBookLoading(true);
    try {
      const result = await Swal.fire({
        title: "Thực hiện book số?",
        text: "Hãy kiểm tra lại danh sách số bạn đã chọn!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Xác nhận",
      });
      if (result.isConfirmed) {
        console.log("Ra đây", requestBody);

        const res = await booking({
          id_phone_numbers: requestBody.id_phone_numbers,
        });
        if (res.status === 200) {
          Swal.fire({
            title: "Book thành công",
            html: `
              <label for="message" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Danh sách số số đã book:
              </label>
              <textarea id="message" rows="4" class="block max-h-[200px] w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 px-[10px]">${requestBody.phone_details?.join(
                ", "
              )}</textarea>
            `,
            showDenyButton: true,
            icon: "success",
            showCancelButton: true,
            confirmButtonText: "Sao chép",
            denyButtonText: "Bỏ qua",
            allowOutsideClick: false,
          }).then((result) => {
            if (result.isConfirmed) {
              copyToClipBoard(requestBody.phone_details || []);
              Swal.fire("Đã sao chép!", "", "success");
            }
          });
          // fetchData();
          setSelectedIds([]);
        }
      }
    } catch (err: any) {
      const error = err.response.data.detail;
      if (
        error ==
        "You have reached your daily booking limit. Please contact your administrator to increase your limit if needed."
      ) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: `Bạn đã đạt đến giới hạn đặt phòng hàng ngày. Vui lòng liên hệ với quản trị viên của bạn để tăng giới hạn nếu cần.`,
        });
      }

      fetchData();
    } finally {
      setBookLoading(false);
    }
  };

  // Handle delete number event
  const handleDelete = async (id: any) => {
    if (typeof id !== "number" || isNaN(id)) {
      console.error("Invalid ID:", id);
      Swal.fire("Lỗi", "ID không hợp lệ");
      return;
    }

    try {
      const result = await Swal.fire({
        title: "Bạn có chắc chắn muốn xóa số này?",
        text: "Dữ liệu sẽ không thể khôi phục nếu xóa",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Xóa!",
      });

      if (result.isConfirmed) {
        const res = await deletePhone(id);
        if (res?.status === 200) {
          Swal.fire({
            title: "Xóa thành công!",
            text: "Số điện thoại đã được xóa",
            icon: "success",
          });
          fetchData();
        }
      }
    } catch (error: any) {
      Swal.fire(
        "Oops...",
        `${error.response?.data?.detail || "Đã xảy ra lỗi"}`,
        "error"
      );
    }
  };

  return (
    <>
      {bookLoading ? (
        <Spinner />
      ) : (
        <>
          <PageBreadcrumb pageTitle="Đặt số điện thoại" />
          {user?.role === 1 ? (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setOpenModal(true)}
                className="flex items-center dark:bg-black dark:text-white  gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50">
                <IoIosAdd size={24} />
                Thêm
              </button>
            </div>
          ) : (
            <></>
          )}

          {/* Form */}
          <div className="space-y-6">
            <SearchHelp />

            <ComponentCard>
              <div className=" grid grid-cols-1 gap-4 lg:grid-cols-3">
                {user.role === 1 && (
                  <div>
                    <Label htmlFor="inputTwo">Tìm kiếm theo đầu số</Label>
                    <Input
                      type="text"
                      id="inputTwo"
                      placeholder="Nhập đầu số..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                )}
                <div>
                  <Label>Nhà cung cấp</Label>
                  <Select
                    options={[
                      { label: "Tất cả", value: "" },
                      ...providers.map((provider) => ({
                        label: provider.name,
                        value: provider.name,
                        key: provider.id,
                      })),
                    ]}
                    className="dark:bg-black dark:text-white "
                    onChange={(value) => {
                      setProvider(value); // Cập nhật typeNumber
                      setOffset(0); // Reset offset về 0
                    }}
                    placeholder="Lựa chọn nhà cung cấp"
                  />
                </div>
                <div>
                  <Label>Định dạng số</Label>
                  <Select
                    options={[
                      { label: "Tất cả", value: "" },
                      ...typeNumbers.map((type) => ({
                        label: type.name,
                        value: type.name,
                        key: type.id,
                      })),
                    ]}
                    className="dark:bg-black dark:text-white "
                    onChange={(value) => {
                      setTypeNumber(value); // Cập nhật typeNumber
                      setOffset(0); // Reset offset về 0
                    }}
                    placeholder="Lựa chọn định dạng số"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => handleBookNumber()}
                    className="flex dark:bg-black dark:text-white items-center gap-2 border rounded-lg border-gray-300 bg-white p-[10px] text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50">
                    <IoIosAdd size={20} />
                    Book số
                  </button>
                  <button
                    onClick={() => setOpenModalRandom(!openModalRandom)}
                    className="flex dark:bg-black dark:text-white items-center gap-2 border rounded-lg border-gray-300 bg-white p-[10px] text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50">
                    <FaRandom size={20} />
                    Random
                  </button>
                </div>
              </div>

              {/* Data table */}

              <ReusableTable
                role={user.role}
                isLoading={loading}
                title="Danh sách số điện thoại"
                data={safeData}
                onCheck={(selectedIds) => getIds(selectedIds)}
                setSelectedIds={setSelectedIds}
                selectedIds={selectedIds}
                error={error}
                columns={columns}
                pagination={{
                  currentPage: offset,
                  pageSize: quantity,
                }}
                actions={[
                  {
                    icon: <FiEye />,
                    onClick: (row) => handleGetById(Number(row.id)),
                    label: "Chi tiết",
                  },
                ]}
                onDelete={(id) => handleDelete(Number(id))}
              />

              {/* Pagination */}
              <Pagination
                limit={quantity}
                offset={offset}
                totalPages={data?.total_pages ?? 0}
                onPageChange={(limit, newOffset) => {
                  setQuantity(limit);
                  setOffset(newOffset);
                }}
                onLimitChange={(newLimit) => {
                  setQuantity(newLimit);
                  setOffset(1);
                }}
              />
            </ComponentCard>
          </div>

          {/* Modal */}
          <PhoneNumberModal
            isOpen={openModal}
            onCloseModal={() => setOpenModal(false)}
            onSuccess={fetchData}
          />
          <PhoneModalDetail
            isOpen={openModalDetail}
            role={user.role}
            onCloseModal={() => setOpenModalDetail(false)}
            data={selectedPhone}
            onSuccess={fetchData}
          />
          <PhoneRandomModal
            isOpen={openModalRandom}
            onCloseModal={() => setOpenModalRandom(false)}
            onSuccess={fetchData}
          />
        </>
      )}
    </>
  );
}

export default PhoneNumberFilters;
