-- CreateTable
CREATE TABLE `document_shares` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `owner_user_id` VARCHAR(191) NOT NULL,
    `share_token` VARCHAR(191) NOT NULL,
    `share_password` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `access_count` INTEGER NOT NULL DEFAULT 0,
    `max_access` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `document_shares_share_token_key`(`share_token`),
    INDEX `document_shares_document_id_idx`(`document_id`),
    INDEX `document_shares_share_token_idx`(`share_token`),
    INDEX `document_shares_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
