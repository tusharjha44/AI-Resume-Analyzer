import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { usePuterStore } from "../../lib/puter";
import Navbar from "../components/Navbar";
import { formatSize } from "../../lib/utils";

const WipeApp = () => {
  const { auth, isLoading, error, clearError, fs, kv } = usePuterStore();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FSItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [resumeCount, setResumeCount] = useState(0);

  const loadFiles = async () => {
    try {
      setLoadingFiles(true);
      const fileList = (await fs.readDir("./")) as FSItem[];
      setFiles(fileList || []);

      // Also get resume count from KV store
      const resumes = (await kv.list("resume:*", false)) as string[];
      setResumeCount(resumes?.length || 0);
    } catch (err) {
      console.error("Error loading files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/wipe");
    } else if (auth.isAuthenticated) {
      loadFiles();
    }
  }, [isLoading, auth.isAuthenticated]);

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setDeleting(true);
      setShowConfirm(false);

      // Delete all files
      for (const file of files) {
        try {
          await fs.delete(file.path);
        } catch (err) {
          console.error(`Error deleting file ${file.name}:`, err);
        }
      }

      // Flush KV store
      await kv.flush();

      setDeleteSuccess(true);
      await loadFiles();

      // Reset success message after 3 seconds
      setTimeout(() => {
        setDeleteSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Error during deletion:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (isLoading || loadingFiles) {
    return (
      <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
        <Navbar />
        <section className="main-section">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
            <h2 className="mt-4">Loading data...</h2>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
        <Navbar />
        <section className="main-section">
          <div className="gradient-border p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-4">
              <img src="/icons/warning.svg" alt="warning" className="w-8 h-8" />
              <h2 className="!text-red-600">Error</h2>
            </div>
            <p className="text-gray-700 mb-4">{error}</p>
            <button onClick={clearError} className="primary-button w-fit px-6">
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  const totalDataSize = files.reduce((acc, file) => acc + (file.size || 0), 0);
  const hasData = files.length > 0 || resumeCount > 0;

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-8">
          <h1>Data Management</h1>
          <h2>Manage your stored files and resume data</h2>
        </div>

        {/* User Info Card */}
        <div className="gradient-border p-6 max-w-4xl w-full mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8e98ff] to-[#606beb] flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {auth.user?.username?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {auth.user?.username || "User"}
                </p>
                <p className="text-sm text-gray-500">Account Information</p>
              </div>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <img src="/icons/back.svg" alt="back" className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-8">
          <div className="gradient-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <img src="/images/pdf.png" alt="files" className="w-8 h-8" />
              <h3 className="text-xl font-semibold text-gray-800">Files</h3>
            </div>
            <p className="text-3xl font-bold text-gradient">{files.length}</p>
            <p className="text-sm text-gray-500 mt-1">
              {formatSize(totalDataSize)} total
            </p>
          </div>

          <div className="gradient-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <img src="/images/pdf.png" alt="resumes" className="w-8 h-8" />
              <h3 className="text-xl font-semibold text-gray-800">Resumes</h3>
            </div>
            <p className="text-3xl font-bold text-gradient">{resumeCount}</p>
            <p className="text-sm text-gray-500 mt-1">Analyzed resumes</p>
          </div>

          <div className="gradient-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <img src="/icons/info.svg" alt="storage" className="w-8 h-8" />
              <h3 className="text-xl font-semibold text-gray-800">Storage</h3>
            </div>
            <p className="text-3xl font-bold text-gradient">
              {formatSize(totalDataSize)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total storage used</p>
          </div>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="max-w-4xl w-full mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Stored Files
              </h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {files.length} file{files.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="gradient-border p-4 max-h-[40vh] overflow-y-auto scrollable-files">
              <div className="space-y-3 pr-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-white rounded-xl p-4 flex items-center justify-between gap-4 animate-in fade-in duration-500 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <img
                        src="/images/pdf.png"
                        alt="file"
                        className="w-10 h-10 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {file.name}
                        </p>
                        {file.size && (
                          <p className="text-sm text-gray-500">
                            {formatSize(file.size)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasData && !loadingFiles && (
          <div className="gradient-border p-12 max-w-2xl w-full text-center">
            <img
              src="/icons/info.svg"
              alt="info"
              className="w-16 h-16 mx-auto mb-4 opacity-50"
            />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No Data Found
            </h2>
            <p className="text-gray-500">
              You don't have any files or resumes stored yet.
            </p>
          </div>
        )}

        {/* Danger Zone */}
        {hasData && (
          <div className="max-w-4xl w-full">
            <div className="gradient-border p-8 border-2 border-red-200 bg-red-50/30">
              <div className="flex items-start gap-4 mb-6">
                <img
                  src="/icons/warning.svg"
                  alt="warning"
                  className="w-8 h-8 shrink-0 mt-1"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-red-700 mb-2">
                    Danger Zone
                  </h2>
                  <p className="text-gray-700 mb-1">
                    This action will permanently delete all your files and
                    resume data.
                  </p>
                  <p className="text-sm text-gray-600">
                    This cannot be undone. Please make sure you want to proceed.
                  </p>
                </div>
              </div>

              {showConfirm ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-white rounded-xl p-4 border-2 border-red-300">
                    <p className="font-semibold text-red-700 mb-2">
                      Are you absolutely sure?
                    </p>
                    <p className="text-sm text-gray-600">
                      This will delete {files.length} file(s) and {resumeCount}{" "}
                      resume record(s). This action cannot be reversed.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <img
                            src="/icons/cross.svg"
                            alt="delete"
                            className="w-5 h-5"
                          />
                          Yes, Delete Everything
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={deleting}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-full transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl"
                >
                  <img
                    src="/icons/warning.svg"
                    alt="warning"
                    className="w-5 h-5"
                  />
                  Wipe All App Data
                </button>
              )}

              {deleteSuccess && (
                <div className="mt-6 bg-green-100 border-2 border-green-300 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
                  <img
                    src="/icons/check.svg"
                    alt="success"
                    className="w-6 h-6 shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-green-800">
                      All data deleted successfully
                    </p>
                    <p className="text-sm text-green-700">
                      Your files and resume data have been permanently removed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default WipeApp;
